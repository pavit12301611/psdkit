//! The radix-2 FFT plan.

use crate::complex::Complex32;
use crate::error::FftError;
use crate::group::FftGroup;

/// A cached radix-2 (decimation-in-time) FFT plan for power-of-two lengths.
///
/// # Algorithm
///
/// * Bit-reversal permutation (incremental swaps in place, or a scatter for
///   out-of-place entry points) followed by `log2(len)` butterfly stages.
/// * Twiddles are stored once as a half table
///   `twiddles[j] = exp(-2πi·j / len)` for `j < len / 2`, computed in `f64`
///   via `sin_cos` and narrowed to `f32`.
/// * Forward transforms are unscaled. Inverse transforms use conjugated
///   twiddles and apply a final `1 / len` scaling.
///
/// Scratch buffers act as a ping-pong pair: the bit-reversed input is
/// scattered into whichever buffer makes the parity work, so after
/// `log2(len)` stages the result always lands in the caller's output —
/// no copy-back is ever needed.
///
/// # Panics
///
/// [`FftPlan::new`] panics when `len` is zero or not a power of two.
#[derive(Debug, Clone)]
pub struct FftPlan {
    len: usize,
    log2_len: usize,
    /// `twiddles[j] = exp(-2πi·j / len)`, `j` in `0..len/2`.
    twiddles: Vec<Complex32>,
}

/// Reverses the low `bits` bits of `x`.
fn reverse_bits(mut x: usize, bits: usize) -> usize {
    let mut rev = 0;
    for _ in 0..bits {
        rev = (rev << 1) | (x & 1);
        x >>= 1;
    }
    rev
}

impl FftPlan {
    /// Creates a plan for transforms of `len` elements.
    ///
    /// # Panics
    ///
    /// Panics if `len` is zero or not a power of two.
    pub fn new(len: usize) -> Self {
        assert!(
            len > 0 && len.is_power_of_two(),
            "FftPlan::new requires a non-zero power-of-two length, got {len}"
        );
        let log2_len = len.trailing_zeros() as usize;
        let mut twiddles = Vec::with_capacity(len / 2);
        for j in 0..len / 2 {
            let theta = -2.0 * std::f64::consts::PI * j as f64 / len as f64;
            let (sin, cos) = theta.sin_cos();
            twiddles.push(Complex32::new(cos as f32, sin as f32));
        }
        Self {
            len,
            log2_len,
            twiddles,
        }
    }

    /// Number of elements this plan transforms.
    #[inline]
    pub fn len(&self) -> usize {
        self.len
    }

    /// Always `false`: plans always handle at least one element.
    #[inline]
    pub fn is_empty(&self) -> bool {
        self.len == 0
    }

    /// Minimum scratch length for a problem of `problem_len` elements.
    #[inline]
    pub fn min_scratch_len(&self, problem_len: usize) -> usize {
        problem_len
    }

    fn ensure_len(&self, got: usize) -> Result<(), FftError> {
        if got != self.len {
            Err(FftError::SizeMismatch {
                expected: self.len,
                got,
            })
        } else {
            Ok(())
        }
    }

    fn ensure_output(&self, input: usize, output: usize) -> Result<(), FftError> {
        if output != input {
            Err(FftError::LengthMismatch { input, output })
        } else {
            Ok(())
        }
    }

    fn ensure_scratch(&self, got: usize) -> Result<(), FftError> {
        if got < self.len {
            Err(FftError::ScratchTooShort {
                needed: self.len,
                got,
            })
        } else {
            Ok(())
        }
    }

    /// In-place bit-reversal swap permutation.
    fn permute_in_place(&self, buf: &mut [Complex32]) {
        for i in 0..self.len {
            let r = reverse_bits(i, self.log2_len);
            if i < r {
                buf.swap(i, r);
            }
        }
    }

    /// Out-of-place bit-reversal scatter: `dst[rev(i)] = src[i]`.
    fn scatter(src: &[Complex32], dst: &mut [Complex32], bits: usize, len: usize) {
        for i in 0..len {
            dst[reverse_bits(i, bits)] = src[i];
        }
    }

    /// One butterfly stage operating on a single buffer.
    ///
    /// Reads `src[base + j]` and `src[base + j + half]` before writing the
    /// same locations, so aliasing (src and dst being the same slice) is safe.
    #[allow(clippy::too_many_arguments)]
    fn stage_in_place(
        buf: &mut [Complex32],
        twiddles: &[Complex32],
        span: usize,
        len: usize,
        inverse: bool,
    ) {
        let half = span / 2;
        let stride = len / span;
        let mut base = 0;
        while base < len {
            for j in 0..half {
                let mut w = twiddles[j * stride];
                if inverse {
                    w = w.conj();
                }
                let u = buf[base + j];
                let t = w * buf[base + j + half];
                buf[base + j] = u + t;
                buf[base + j + half] = u - t;
            }
            base += span;
        }
    }

    /// One butterfly stage reading from `src` and writing to a distinct
    /// `dst` (ping-pong mode).
    #[allow(clippy::too_many_arguments)]
    fn stage_copy(
        src: &[Complex32],
        dst: &mut [Complex32],
        twiddles: &[Complex32],
        span: usize,
        len: usize,
        inverse: bool,
    ) {
        let half = span / 2;
        let stride = len / span;
        let mut base = 0;
        while base < len {
            for j in 0..half {
                let mut w = twiddles[j * stride];
                if inverse {
                    w = w.conj();
                }
                let u = src[base + j];
                let t = w * src[base + j + half];
                dst[base + j] = u + t;
                dst[base + j + half] = u - t;
            }
            base += span;
        }
    }

    /// Full butterfly sequence in place (no allocation).
    fn stages_in_place(&self, buf: &mut [Complex32], inverse: bool) {
        let mut span = 2;
        while span <= self.len {
            Self::stage_in_place(buf, &self.twiddles, span, self.len, inverse);
            span *= 2;
        }
    }

    /// Ping-pong driver: after `log2(len)` stages the result sits in
    /// `primary`, guaranteed by the caller choosing `start_in_primary`
    /// according to stage-count parity.
    fn run_scratch_core(
        &self,
        primary: &mut [Complex32],
        scratch: &mut [Complex32],
        inverse: bool,
        start_in_primary: bool,
    ) {
        let mut result_in_primary = start_in_primary;
        let mut span = 2;
        while span <= self.len {
            if result_in_primary {
                Self::stage_copy(
                    &*primary,
                    &mut *scratch,
                    &self.twiddles,
                    span,
                    self.len,
                    inverse,
                );
            } else {
                Self::stage_copy(
                    &*scratch,
                    &mut *primary,
                    &self.twiddles,
                    span,
                    self.len,
                    inverse,
                );
            }
            result_in_primary = !result_in_primary;
            span *= 2;
        }
        debug_assert!(
            result_in_primary,
            "parity bookkeeping error: result must land in the primary buffer"
        );
    }

    /// Bit-reversal entry point that fills `primary` or `scratch` so that
    /// `run_scratch_core` ends in `primary`.
    fn seed_scratch_path(
        &self,
        src: &[Complex32],
        primary: &mut [Complex32],
        scratch: &mut [Complex32],
        start_in_primary: bool,
    ) {
        if start_in_primary {
            Self::scatter(src, primary, self.log2_len, self.len);
        } else {
            Self::scatter(src, scratch, self.log2_len, self.len);
        }
    }

    #[inline]
    fn start_in_primary(&self) -> bool {
        // log2(len) even -> seed the primary buffer, odd -> seed scratch.
        self.log2_len % 2 == 0
    }

    fn scale(buf: &mut [Complex32], k: f32) {
        for c in buf.iter_mut() {
            *c = c.scale(k);
        }
    }

    // ------------------------------------------------------------------
    // Plain in-place API
    // ------------------------------------------------------------------

    /// Forward (unscaled) transform in place. `buf.len()` must equal the
    /// plan length.
    pub fn forward(&self, buf: &mut [Complex32]) -> Result<(), FftError> {
        self.ensure_len(buf.len())?;
        self.permute_in_place(buf);
        self.stages_in_place(buf, false);
        Ok(())
    }

    /// Inverse transform in place: conjugated twiddles plus a final
    /// `1 / len` scaling. `buf.len()` must equal the plan length.
    pub fn inverse(&self, buf: &mut [Complex32]) -> Result<(), FftError> {
        self.ensure_len(buf.len())?;
        self.permute_in_place(buf);
        self.stages_in_place(buf, true);
        Self::scale(buf, 1.0 / self.len as f32);
        Ok(())
    }

    // ------------------------------------------------------------------
    // In-place with scratch (ping-pong stages)
    // ------------------------------------------------------------------

    /// Forward transform in place; butterfly stages ping-pong through
    /// `scratch` (which must hold at least `min_scratch_len(len)` items).
    pub fn forward_with_scratch(
        &self,
        buf: &mut [Complex32],
        scratch: &mut [Complex32],
    ) -> Result<(), FftError> {
        self.ensure_len(buf.len())?;
        self.ensure_scratch(scratch.len())?;
        let start = self.start_in_primary();
        if start {
            self.permute_in_place(buf);
        } else {
            // Copy bit-reversed input into scratch; primary keeps the raw
            // data until the first stage overwrites it.
            Self::scatter(&*buf, scratch, self.log2_len, self.len);
        }
        self.run_scratch_core(buf, scratch, false, start);
        Ok(())
    }

    /// Inverse transform with ping-pong scratch stages and final `1 / len`
    /// scaling.
    pub fn inverse_with_scratch(
        &self,
        buf: &mut [Complex32],
        scratch: &mut [Complex32],
    ) -> Result<(), FftError> {
        self.ensure_len(buf.len())?;
        self.ensure_scratch(scratch.len())?;
        let start = self.start_in_primary();
        if start {
            self.permute_in_place(buf);
        } else {
            Self::scatter(&*buf, scratch, self.log2_len, self.len);
        }
        self.run_scratch_core(buf, scratch, true, start);
        Self::scale(buf, 1.0 / self.len as f32);
        Ok(())
    }

    // ------------------------------------------------------------------
    // Out-of-place API
    // ------------------------------------------------------------------

    /// Forward transform from `input` into `output` using `scratch`.
    ///
    /// The three slices must not alias each other.
    pub fn forward_out_of_place(
        &self,
        input: &[Complex32],
        output: &mut [Complex32],
        scratch: &mut [Complex32],
    ) -> Result<(), FftError> {
        self.ensure_len(input.len())?;
        self.ensure_output(input.len(), output.len())?;
        self.ensure_scratch(scratch.len())?;
        let start = self.start_in_primary();
        self.seed_scratch_path(input, output, scratch, start);
        self.run_scratch_core(output, scratch, false, start);
        Ok(())
    }

    /// Inverse transform from `input` into `output` using `scratch`,
    /// with a final `1 / len` scaling of `output`.
    ///
    /// The three slices must not alias each other.
    pub fn inverse_out_of_place(
        &self,
        input: &[Complex32],
        output: &mut [Complex32],
        scratch: &mut [Complex32],
    ) -> Result<(), FftError> {
        self.ensure_len(input.len())?;
        self.ensure_output(input.len(), output.len())?;
        self.ensure_scratch(scratch.len())?;
        let start = self.start_in_primary();
        self.seed_scratch_path(input, output, scratch, start);
        self.run_scratch_core(output, scratch, true, start);
        Self::scale(output, 1.0 / self.len as f32);
        Ok(())
    }

    // ------------------------------------------------------------------
    // Allocating Vec helpers
    // ------------------------------------------------------------------

    /// Forward transform returning a freshly allocated `Vec`.
    pub fn forward_vec(&self, input: &[Complex32]) -> Result<Vec<Complex32>, FftError> {
        self.ensure_len(input.len())?;
        let mut out = input.to_vec();
        self.forward(&mut out)?;
        Ok(out)
    }

    /// Inverse transform returning a freshly allocated `Vec`.
    pub fn inverse_vec(&self, input: &[Complex32]) -> Result<Vec<Complex32>, FftError> {
        self.ensure_len(input.len())?;
        let mut out = input.to_vec();
        self.inverse(&mut out)?;
        Ok(out)
    }
}

impl FftGroup for FftPlan {
    fn len(&self) -> usize {
        FftPlan::len(self)
    }

    fn is_empty(&self) -> bool {
        FftPlan::is_empty(self)
    }

    fn min_scratch_len(&self, problem_len: usize) -> usize {
        FftPlan::min_scratch_len(self, problem_len)
    }

    fn forward(&self, buf: &mut [Complex32]) -> Result<(), FftError> {
        FftPlan::forward(self, buf)
    }

    fn inverse(&self, buf: &mut [Complex32]) -> Result<(), FftError> {
        FftPlan::inverse(self, buf)
    }

    fn forward_with_scratch(
        &self,
        buf: &mut [Complex32],
        scratch: &mut [Complex32],
    ) -> Result<(), FftError> {
        FftPlan::forward_with_scratch(self, buf, scratch)
    }

    fn inverse_with_scratch(
        &self,
        buf: &mut [Complex32],
        scratch: &mut [Complex32],
    ) -> Result<(), FftError> {
        FftPlan::inverse_with_scratch(self, buf, scratch)
    }

    fn forward_out_of_place(
        &self,
        input: &[Complex32],
        output: &mut [Complex32],
        scratch: &mut [Complex32],
    ) -> Result<(), FftError> {
        FftPlan::forward_out_of_place(self, input, output, scratch)
    }

    fn inverse_out_of_place(
        &self,
        input: &[Complex32],
        output: &mut [Complex32],
        scratch: &mut [Complex32],
    ) -> Result<(), FftError> {
        FftPlan::inverse_out_of_place(self, input, output, scratch)
    }
}

#[cfg(test)]
mod tests {
    use super::reverse_bits;

    #[test]
    fn reverse_bits_reference_values() {
        assert_eq!(reverse_bits(0, 3), 0);
        assert_eq!(reverse_bits(1, 3), 4);
        assert_eq!(reverse_bits(2, 3), 2); // 010 reversed is 010
        assert_eq!(reverse_bits(3, 3), 6);
        assert_eq!(reverse_bits(4, 3), 1); // 100 reversed is 001
        assert_eq!(reverse_bits(5, 3), 5);
        assert_eq!(reverse_bits(6, 3), 3);
        assert_eq!(reverse_bits(7, 3), 7);
        assert_eq!(reverse_bits(0, 0), 0);
        assert_eq!(reverse_bits(9, 4), 9); // 1001 reversed is 1001
    }
}
