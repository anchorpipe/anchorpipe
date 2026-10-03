use std::io::{self, BufRead, Write};

use anchorpipe_normalizer::normalize_message_json;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // The executable is deliberately transport-neutral: one JSON input message per line,
    // one canonical JSON output message per line. RabbitMQ deployments should use the
    // MessageTransport trait from the library and apply their own ack/retry policy.
    let stdin = io::stdin();
    let mut stdout = io::BufWriter::new(io::stdout().lock());
    for line in stdin.lock().lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }
        match normalize_message_json(line.as_bytes()) {
            Ok(output) => {
                stdout.write_all(&output)?;
                stdout.write_all(b"\n")?;
            }
            Err(error) => {
                eprintln!("normalization failed: {error}");
                return Err(Box::new(error));
            }
        }
    }
    stdout.flush()?;
    Ok(())
}
