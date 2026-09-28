//! The [`FftGroup`] abstraction.

use crate::complex::Complex32;
use crate::error::FftError;

/// Object-safe abstraction over an FFT driver.
///
/// A group knows how to transform buffers for one fixed problem shape.
/// Three calling styles are provided for every direction:
///
/// * [`forward`](FftGroup::forward) / [`inverse`](FftGroup::inverse) —
///   plain in-place, allocation free.
/// * [`forward_with_scratch`](FftGroup::forward_with_scratch) /
///   [`inverse_with_scratch`](FftGroup::inverse_with_scratch) — in-place
///   result, but butterfly stages ping-pong through a caller supplied
///   scratch buffer instead of swapping in place.
/// * [`forward_out_of_place`](FftGroup::forward_out_of_place) /
///   [`inverse_out_of_place`](FftGroup::inverse_out_of_place) — reads a
///   separate input and writes a separate output using scratch.
///
/// The trait is object safe, so `Box<dyn FftGroup>` and `Arc<dyn FftGroup>`
/// work as drop-in handles.
pub trait FftGroup {
    /// Number of elements of one problem this group handles.
    fn len(&self) -> usize;

    /// Returns `true` when the group handles zero-length problems.
    ///
    /// Concrete plans always handle at least one element, so this is never
    /// `true` for them.
    fn is_empty(&self) -> bool {
        self.len() == 0
    }

    /// Minimum scratch buffer length needed for a problem of
    /// `problem_len` elements.
    fn min_scratch_len(&self, problem_len: usize) -> usize {
        problem_len
    }

    /// Forward (unscaled) transform in place.
    fn forward(&self, buf: &mut [Complex32]) -> Result<(), FftError>;

    /// Inverse transform in place: conjugated twiddles plus a final
    /// `1 / len` scaling.
    fn inverse(&self, buf: &mut [Complex32]) -> Result<(), FftError>;

    /// Forward transform in place using `scratch` for ping-pong stages.
    fn forward_with_scratch(
        &self,
        buf: &mut [Complex32],
        scratch: &mut [Complex32],
    ) -> Result<(), FftError>;

    /// Inverse transform in place using `scratch` for ping-pong stages.
    fn inverse_with_scratch(
        &self,
        buf: &mut [Complex32],
        scratch: &mut [Complex32],
    ) -> Result<(), FftError>;

    /// Forward transform from `input` into `output` using `scratch`.
    ///
    /// `input`, `output` and `scratch` must not alias each other.
    fn forward_out_of_place(
        &self,
        input: &[Complex32],
        output: &mut [Complex32],
        scratch: &mut [Complex32],
    ) -> Result<(), FftError>;

    /// Inverse transform from `input` into `output` using `scratch`.
    ///
    /// `input`, `output` and `scratch` must not alias each other.
    fn inverse_out_of_place(
        &self,
        input: &[Complex32],
        output: &mut [Complex32],
        scratch: &mut [Complex32],
    ) -> Result<(), FftError>;
}
