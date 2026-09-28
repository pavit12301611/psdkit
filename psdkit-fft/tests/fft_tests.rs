//! Integration test suite for psdkit-fft.
//!
//! Strategy: compare against a naive O(N²) DFT for small sizes, verify the
//! forward/inverse round trip, exercise every calling style (plain in-place,
//! scratch ping-pong, out-of-place, allocating Vec helpers), pin down all
//! error paths, and dispatch through `Arc<dyn FftGroup>`.

use psdkit_fft::{Complex32, FftError, FftGroup, FftPlan};
use std::sync::Arc;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Deterministic 64-bit LCG so tests are reproducible without dependencies.
struct Lcg(u64);

impl Lcg {
    fn new(seed: u64) -> Self {
        Self(seed.max(1))
    }

    /// Uniform-ish value in [-1, 1].
    fn next_f32(&mut self) -> f32 {
        self.0 = self
            .0
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        let unit = ((self.0 >> 40) as f64) / ((1u64 << 24) as f64);
        (unit as f32) * 2.0 - 1.0
    }

    fn complex(&mut self) -> Complex32 {
        Complex32::new(self.next_f32(), self.next_f32())
    }
}

fn signal(n: usize, seed: u64) -> Vec<Complex32> {
    let mut rng = Lcg::new(seed);
    (0..n).map(|_| rng.complex()).collect()
}

/// Reference O(N²) DFT. `inverse == true` applies the `1 / n` scale.
fn naive_dft(x: &[Complex32], inverse: bool) -> Vec<Complex32> {
    let n = x.len();
    let sign = if inverse { 1.0 } else { -1.0 };
    let mut out = vec![Complex32::ZERO; n];
    for k in 0..n {
        let mut acc = Complex32::ZERO;
        for (j, xj) in x.iter().enumerate() {
            // Reduce the angle modulo n for numerical cleanliness.
            let turns = sign * ((k * j) % n) as f64 / n as f64;
            let w = Complex32::from_polar(1.0, (2.0 * std::f64::consts::PI * turns) as f32);
            acc = acc + *xj * w;
        }
        if inverse {
            acc = acc.scale(1.0 / n as f32);
        }
        out[k] = acc;
    }
    out
}

fn assert_close(got: &[Complex32], want: &[Complex32], tol: f32, ctx: &str) {
    assert_eq!(got.len(), want.len(), "{ctx}: length mismatch");
    for (i, (g, w)) in got.iter().zip(want.iter()).enumerate() {
        let d = *g - *w;
        assert!(
            d.re.abs() <= tol && d.im.abs() <= tol,
            "{ctx}: element {i}: got ({}, {}), want ({}, {}), diff ({}, {})",
            g.re,
            g.im,
            w.re,
            w.im,
            d.re,
            d.im
        );
    }
}

// ---------------------------------------------------------------------------
// Plan construction
// ---------------------------------------------------------------------------

#[test]
#[should_panic]
fn plan_rejects_zero_length() {
    let _ = FftPlan::new(0);
}

#[test]
#[should_panic]
fn plan_rejects_three() {
    let _ = FftPlan::new(3);
}

#[test]
#[should_panic]
fn plan_rejects_twelve() {
    let _ = FftPlan::new(12);
}

#[test]
fn plan_accepts_powers_of_two() {
    for n in [1usize, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024] {
        let plan = FftPlan::new(n);
        assert_eq!(plan.len(), n);
        assert!(!plan.is_empty());
        assert_eq!(plan.min_scratch_len(n), n);
        assert_eq!(plan.min_scratch_len(100), 100);
    }
}

// ---------------------------------------------------------------------------
// Correctness vs the naive DFT
// ---------------------------------------------------------------------------

#[test]
fn forward_matches_naive_dft() {
    for n in [1usize, 2, 4, 8, 16, 32, 64] {
        let x = signal(n, 42 + n as u64);
        let plan = FftPlan::new(n);
        let mut got = x.clone();
        plan.forward(&mut got).unwrap();
        let want = naive_dft(&x, false);
        assert_close(&got, &want, 5e-3, &format!("forward n={n}"));
    }
}

#[test]
fn inverse_matches_naive_idft() {
    for n in [1usize, 2, 4, 8, 16, 32, 64] {
        let x = signal(n, 700 + n as u64);
        let plan = FftPlan::new(n);
        let mut got = x.clone();
        plan.inverse(&mut got).unwrap();
        let want = naive_dft(&x, true);
        assert_close(&got, &want, 5e-3, &format!("inverse n={n}"));
    }
}

#[test]
fn inverse_of_forward_is_identity() {
    for n in [2usize, 8, 64, 256, 1024] {
        let x = signal(n, 7 + n as u64);
        let plan = FftPlan::new(n);
        let y = plan.forward_vec(&x).unwrap();
        let z = plan.inverse_vec(&y).unwrap();
        assert_close(&z, &x, 5e-3, &format!("roundtrip n={n}"));
    }
}

#[test]
fn inverse_equals_conjugated_forward_scaled() {
    // inverse(x) == conj(forward(conj(x))) / n  — the standard identity.
    for n in [4usize, 32, 64] {
        let x = signal(n, 3 + n as u64);
        let plan = FftPlan::new(n);
        let conj_x: Vec<Complex32> = x.iter().map(|c| c.conj()).collect();
        let spectrum = plan.forward_vec(&conj_x).unwrap();
        let want: Vec<Complex32> = spectrum
            .iter()
            .map(|c| c.conj().scale(1.0 / n as f32))
            .collect();
        let got = plan.inverse_vec(&x).unwrap();
        assert_close(&got, &want, 5e-3, &format!("conj-identity n={n}"));
    }
}

// ---------------------------------------------------------------------------
// Every calling style agrees
// ---------------------------------------------------------------------------

#[test]
fn in_place_scratch_and_out_of_place_agree() {
    // Sizes cover both scratch parities: log2 odd (2, 8, 64 wait 64=2^6)…
    // log2 = 1, 2, 3, 4, 6 — both odd and even stage counts.
    for n in [2usize, 4, 8, 16, 64] {
        let x = signal(n, 99 + n as u64);
        let plan = FftPlan::new(n);

        let mut plain = x.clone();
        plan.forward(&mut plain).unwrap();

        let mut with_scratch = x.clone();
        let mut scratch = vec![Complex32::ZERO; n];
        plan.forward_with_scratch(&mut with_scratch, &mut scratch)
            .unwrap();

        let mut out = vec![Complex32::ZERO; n];
        let mut scratch2 = vec![Complex32::ZERO; n + 3]; // oversized is fine
        plan.forward_out_of_place(&x, &mut out, &mut scratch2)
            .unwrap();

        assert_close(&with_scratch, &plain, 1e-4, &format!("scratch fwd n={n}"));
        assert_close(&out, &plain, 1e-4, &format!("oop fwd n={n}"));

        // Same agreement on the inverse side.
        let mut inv_plain = plain.clone();
        plan.inverse(&mut inv_plain).unwrap();

        let mut inv_scratch = plain.clone();
        let mut scratch3 = vec![Complex32::ZERO; n];
        plan.inverse_with_scratch(&mut inv_scratch, &mut scratch3)
            .unwrap();

        let mut inv_out = vec![Complex32::ZERO; n];
        let mut scratch4 = vec![Complex32::ZERO; n];
        plan.inverse_out_of_place(&plain, &mut inv_out, &mut scratch4)
            .unwrap();

        assert_close(&inv_scratch, &inv_plain, 1e-4, &format!("scratch inv n={n}"));
        assert_close(&inv_out, &inv_plain, 1e-4, &format!("oop inv n={n}"));
        assert_close(&inv_plain, &x, 5e-3, &format!("roundtrip styles n={n}"));
    }
}

// ---------------------------------------------------------------------------
// Signal-processing properties
// ---------------------------------------------------------------------------

#[test]
fn len1_is_identity() {
    let plan = FftPlan::new(1);
    let original = Complex32::new(3.5, -2.25);

    let mut buf = [original];
    plan.forward(&mut buf).unwrap();
    assert_eq!(buf[0], original);
    plan.inverse(&mut buf).unwrap();
    assert_eq!(buf[0], original);

    let mut buf = [original];
    let mut scratch = [Complex32::ZERO];
    plan.forward_with_scratch(&mut buf, &mut scratch).unwrap();
    assert_eq!(buf[0], original);

    let mut out = [Complex32::ZERO];
    plan.forward_out_of_place(&[original], &mut out, &mut scratch)
        .unwrap();
    assert_eq!(out[0], original);
}

#[test]
fn impulse_transforms_to_ones() {
    let n = 16;
    let plan = FftPlan::new(n);
    let mut buf = vec![Complex32::ZERO; n];
    buf[0] = Complex32::new(1.0, 0.0);
    plan.forward(&mut buf).unwrap();
    for (i, c) in buf.iter().enumerate() {
        assert!((c.re - 1.0).abs() < 1e-5 && c.im.abs() < 1e-5, "bin {i}: {c:?}");
    }
}

#[test]
fn complex_tone_lands_in_its_bin() {
    let n = 32;
    let k0 = 5;
    let x: Vec<Complex32> = (0..n)
        .map(|j| Complex32::from_polar(1.0, 2.0 * std::f32::consts::PI * k0 as f32 * j as f32 / n as f32))
        .collect();
    let plan = FftPlan::new(n);
    let y = plan.forward_vec(&x).unwrap();
    let tol = 0.02 * n as f32;
    for (k, c) in y.iter().enumerate() {
        let want_re = if k == k0 { n as f32 } else { 0.0 };
        assert!(
            (c.re - want_re).abs() < tol && c.im.abs() < tol,
            "bin {k}: got {c:?}, want re={want_re}"
        );
    }
}

// ---------------------------------------------------------------------------
// Error paths
// ---------------------------------------------------------------------------

#[test]
fn wrong_buffer_length_reports_size_mismatch() {
    let plan = FftPlan::new(8);
    let short = vec![Complex32::ZERO; 7];
    let err = FftError::SizeMismatch {
        expected: 8,
        got: 7,
    };

    let mut buf = short.clone();
    assert_eq!(plan.forward(&mut buf), Err(err.clone()));
    assert_eq!(plan.inverse(&mut buf), Err(err.clone()));

    let mut scratch = vec![Complex32::ZERO; 8];
    assert_eq!(
        plan.forward_with_scratch(&mut buf, &mut scratch),
        Err(err.clone())
    );
    assert_eq!(
        plan.inverse_with_scratch(&mut buf, &mut scratch),
        Err(err)
    );
}

#[test]
fn output_length_reports_length_mismatch() {
    let plan = FftPlan::new(8);
    let input = vec![Complex32::ZERO; 8];
    let mut output = vec![Complex32::ZERO; 5];
    let mut scratch = vec![Complex32::ZERO; 8];
    let err = FftError::LengthMismatch {
        input: 8,
        output: 5,
    };
    assert_eq!(
        plan.forward_out_of_place(&input, &mut output, &mut scratch),
        Err(err.clone())
    );
    assert_eq!(
        plan.inverse_out_of_place(&input, &mut output, &mut scratch),
        Err(err)
    );
}

#[test]
fn short_scratch_reports_scratch_too_short() {
    let plan = FftPlan::new(8);
    let mut buf = vec![Complex32::ZERO; 8];
    let mut short_scratch = vec![Complex32::ZERO; 7];
    let err = FftError::ScratchTooShort {
        needed: 8,
        got: 7,
    };
    assert_eq!(
        plan.forward_with_scratch(&mut buf, &mut short_scratch),
        Err(err.clone())
    );
    assert_eq!(
        plan.inverse_with_scratch(&mut buf, &mut short_scratch),
        Err(err)
    );

    let input = vec![Complex32::ZERO; 8];
    let mut output = vec![Complex32::ZERO; 8];
    let mut empty_scratch = Vec::new();
    assert_eq!(
        plan.forward_out_of_place(&input, &mut output, &mut empty_scratch),
        Err(FftError::ScratchTooShort {
            needed: 8,
            got: 0
        })
    );
}

#[test]
fn helpers_propagate_length_errors() {
    let plan = FftPlan::new(4);
    let short = vec![Complex32::ZERO; 3];
    assert_eq!(
        plan.forward_vec(&short),
        Err(FftError::SizeMismatch {
            expected: 4,
            got: 3
        })
    );
    assert_eq!(
        plan.inverse_vec(&short),
        Err(FftError::SizeMismatch {
            expected: 4,
            got: 3
        })
    );
}

#[test]
fn error_display_and_std_error_trait() {
    let e = FftError::SizeMismatch {
        expected: 8,
        got: 7,
    };
    let s = e.to_string();
    assert!(s.contains('8'), "display should mention expected: {s}");
    assert!(s.contains('7'), "display should mention got: {s}");
    assert!(s.to_lowercase().contains("mismatch"), "display: {s}");

    let boxed: Box<dyn std::error::Error> =
        Box::new(FftError::ScratchTooShort { needed: 4, got: 0 });
    assert!(boxed.to_string().contains("scratch"));

    let msg = FftError::LengthMismatch {
        input: 4,
        output: 9,
    }
    .to_string();
    assert!(msg.contains('4') && msg.contains('9'));
}

// ---------------------------------------------------------------------------
// FftGroup object safety
// ---------------------------------------------------------------------------

#[test]
fn arc_dyn_group_dispatches() {
    let plans: Vec<Arc<dyn FftGroup>> = vec![
        Arc::new(FftPlan::new(4)),
        Arc::new(FftPlan::new(16)),
        Arc::new(FftPlan::new(64)),
    ];

    for p in &plans {
        assert!(!p.is_empty());
        assert!(p.len().is_power_of_two());
        assert_eq!(p.min_scratch_len(p.len()), p.len());
        assert_eq!(p.min_scratch_len(123), 123);

        let x = signal(p.len(), 5 + p.len() as u64);
        let mut buf = x.clone();

        p.forward(&mut buf).unwrap();

        let mut scratch = vec![Complex32::ZERO; p.len()];
        p.inverse_with_scratch(&mut buf, &mut scratch).unwrap();
        assert_close(&buf, &x, 5e-3, &format!("dyn roundtrip len={}", p.len()));

        // Out-of-place through the trait object too.
        let mut out = vec![Complex32::ZERO; p.len()];
        let mut scratch2 = vec![Complex32::ZERO; p.min_scratch_len(p.len())];
        p.forward_out_of_place(&x, &mut out, &mut scratch2).unwrap();
        let mut plain = x.clone();
        p.forward(&mut plain).unwrap();
        assert_close(&out, &plain, 1e-4, &format!("dyn oop len={}", p.len()));
    }

    assert_eq!(plans[0].len(), 4);
    assert_eq!(plans[1].len(), 16);
    assert_eq!(plans[2].len(), 64);
}

// ---------------------------------------------------------------------------
// Vec helpers
// ---------------------------------------------------------------------------

#[test]
fn vec_helpers_match_in_place_results() {
    for n in [2usize, 4, 8, 32] {
        let x = signal(n, 1234 + n as u64);
        let plan = FftPlan::new(n);

        let via_vec = plan.forward_vec(&x).unwrap();
        let mut inplace = x.clone();
        plan.forward(&mut inplace).unwrap();
        assert_close(&via_vec, &inplace, 1e-5, &format!("forward_vec n={n}"));

        let back = plan.inverse_vec(&via_vec).unwrap();
        assert_close(&back, &x, 5e-3, &format!("inverse_vec n={n}"));
    }
}
