# psdkit-fft

Dependency-free radix-2 FFT for `f32` complex data — power-of-two plans,
an object-safe `FftGroup` abstraction, scratch-buffer ping-pong kernels and
allocating `Vec` helpers.

Zero dependencies by design: the crate builds fully offline
(no crates.io access needed).

## Usage

```rust
use psdkit_fft::{Complex32, FftPlan};

let plan = FftPlan::new(4);
let mut buf = vec![Complex32::ZERO; 4];
buf[0] = Complex32::new(1.0, 0.0);

plan.forward(&mut buf)?;            // unscaled forward, in place
plan.inverse(&mut buf)?;            // inverse with 1/N scaling

// Allocating helpers
let spectrum = plan.forward_vec(&buf)?;
let restored = plan.inverse_vec(&spectrum)?;
```

## Calling styles

| Style | Method | Scratch |
| --- | --- | --- |
| In-place | `forward` / `inverse` | none (allocation free) |
| In-place, ping-pong stages | `forward_with_scratch` / `inverse_with_scratch` | `min_scratch_len(len)` |
| Out-of-place | `forward_out_of_place` / `inverse_out_of_place` | `min_scratch_len(len)` |
| Allocating | `forward_vec` / `inverse_vec` | internal |

All shapes are checked: `FftError::{SizeMismatch, LengthMismatch,
ScratchTooShort}`.

## FftGroup

`FftPlan` implements the object-safe `FftGroup` trait, so plans can be
stored behind `Box<dyn FftGroup>` / `Arc<dyn FftGroup>` and dispatched
uniformly.

## Testing

```sh
cargo test
```

The suite compares every size up to 64 against a naive O(N²) DFT, checks
round trips up to 1024, verifies all calling styles agree, pins every error
path and exercises `Arc<dyn FftGroup>` dispatch.
