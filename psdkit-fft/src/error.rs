//! Error type for FFT operations.

use core::fmt;

/// Errors produced when an FFT operation is called with buffers whose
/// shapes do not match the plan.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FftError {
    /// A primary buffer (plan input or in-place buffer) has the wrong
    /// length for the plan.
    SizeMismatch {
        /// Length required by the plan.
        expected: usize,
        /// Length actually supplied.
        got: usize,
    },
    /// The out-of-place output buffer does not match the input buffer.
    LengthMismatch {
        /// Length of the input buffer.
        input: usize,
        /// Length of the output buffer.
        output: usize,
    },
    /// The scratch buffer is shorter than [`crate::FftGroup::min_scratch_len`].
    ScratchTooShort {
        /// Number of scratch elements required.
        needed: usize,
        /// Number of scratch elements supplied.
        got: usize,
    },
}

impl fmt::Display for FftError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::SizeMismatch { expected, got } => write!(
                f,
                "FFT size mismatch: expected buffer length {expected}, got {got}"
            ),
            Self::LengthMismatch { input, output } => write!(
                f,
                "FFT buffer length mismatch: input has {input} elements, output has {output}"
            ),
            Self::ScratchTooShort { needed, got } => write!(
                f,
                "FFT scratch buffer too short: need {needed} elements, got {got}"
            ),
        }
    }
}

impl std::error::Error for FftError {}
