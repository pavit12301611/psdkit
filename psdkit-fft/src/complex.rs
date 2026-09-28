//! Minimal complex number type used by the crate.
//!
//! The crate ships its own `Complex32` instead of pulling `num-complex` so
//! that it stays dependency-free and builds in fully offline environments.

use core::ops::{Add, AddAssign, Mul, Neg, Sub, SubAssign};

/// A complex number with `f32` components in rectangular form.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Complex32 {
    /// Real part.
    pub re: f32,
    /// Imaginary part.
    pub im: f32,
}

impl Complex32 {
    /// The complex number `0 + 0i`.
    pub const ZERO: Self = Self { re: 0.0, im: 0.0 };

    /// Builds a complex number from its real and imaginary parts.
    #[inline]
    pub const fn new(re: f32, im: f32) -> Self {
        Self { re, im }
    }

    /// Builds a complex number from polar coordinates: magnitude `mag` and
    /// argument `arg` (radians).
    #[inline]
    pub fn from_polar(mag: f32, arg: f32) -> Self {
        let (sin, cos) = arg.sin_cos();
        Self {
            re: mag * cos,
            im: mag * sin,
        }
    }

    /// Returns the complex conjugate.
    #[inline]
    pub fn conj(self) -> Self {
        Self {
            re: self.re,
            im: -self.im,
        }
    }

    /// Returns `re² + im²` (the squared Euclidean norm).
    #[inline]
    pub fn norm_sqr(self) -> f32 {
        self.re * self.re + self.im * self.im
    }

    /// Multiplies both components by the real scalar `k`.
    #[inline]
    pub fn scale(self, k: f32) -> Self {
        Self {
            re: self.re * k,
            im: self.im * k,
        }
    }
}

impl Add for Complex32 {
    type Output = Self;
    #[inline]
    fn add(self, rhs: Self) -> Self {
        Self {
            re: self.re + rhs.re,
            im: self.im + rhs.im,
        }
    }
}

impl Sub for Complex32 {
    type Output = Self;
    #[inline]
    fn sub(self, rhs: Self) -> Self {
        Self {
            re: self.re - rhs.re,
            im: self.im - rhs.im,
        }
    }
}

impl Neg for Complex32 {
    type Output = Self;
    #[inline]
    fn neg(self) -> Self {
        Self {
            re: -self.re,
            im: -self.im,
        }
    }
}

/// Complex multiplication.
impl Mul for Complex32 {
    type Output = Self;
    #[inline]
    fn mul(self, rhs: Self) -> Self {
        Self {
            re: self.re * rhs.re - self.im * rhs.im,
            im: self.re * rhs.im + self.im * rhs.re,
        }
    }
}

/// Multiplication by a real scalar.
impl Mul<f32> for Complex32 {
    type Output = Self;
    #[inline]
    fn mul(self, rhs: f32) -> Self {
        self.scale(rhs)
    }
}

impl AddAssign for Complex32 {
    #[inline]
    fn add_assign(&mut self, rhs: Self) {
        *self = *self + rhs;
    }
}

impl SubAssign for Complex32 {
    #[inline]
    fn sub_assign(&mut self, rhs: Self) {
        *self = *self - rhs;
    }
}

impl From<(f32, f32)> for Complex32 {
    #[inline]
    fn from((re, im): (f32, f32)) -> Self {
        Self { re, im }
    }
}
