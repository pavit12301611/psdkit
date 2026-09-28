//! # psdkit-fft
//!
//! Dependency-free radix-2 FFT for `f32` complex data.
//!
//! The crate offers three layers on top of each other:
//!
//! * [`Complex32`] — a tiny self-contained complex number type.
//! * [`FftPlan`] — a cached power-of-two plan with in-place, in-place-with-
//!   scratch, out-of-place and allocating-`Vec` entry points.
//! * [`FftGroup`] — an object-safe trait (`Arc<dyn FftGroup>`, …) implemented
//!   by [`FftPlan`], so heterogeneous drivers can be stored and dispatched
//!   uniformly.
//!
//! Forward transforms are unscaled; inverse transforms apply the `1 / len`
//! scaling. Only power-of-two lengths are supported — [`FftPlan::new`]
//! panics otherwise.
//!
//! ```
//! use psdkit_fft::{Complex32, FftPlan};
//!
//! let plan = FftPlan::new(4);
//! let impulse = [
//!     Complex32::new(1.0, 0.0),
//!     Complex32::ZERO,
//!     Complex32::ZERO,
//!     Complex32::ZERO,
//! ];
//! let spectrum = plan.forward_vec(&impulse).unwrap();
//! for bin in &spectrum {
//!     assert!((bin.re - 1.0).abs() < 1e-6);
//!     assert!(bin.im.abs() < 1e-6);
//! }
//!
//! // Round trip: inverse(forward(x)) == x
//! let restored = plan.inverse_vec(&spectrum).unwrap();
//! assert!((restored[0].re - 1.0).abs() < 1e-6);
//! ```

mod complex;
mod error;
mod group;
mod plan;

pub use complex::Complex32;
pub use error::FftError;
pub use group::FftGroup;
pub use plan::FftPlan;
