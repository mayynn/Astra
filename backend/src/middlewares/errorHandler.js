export function errorHandler(err, req, res, next) {
  if (err.name === "ZodError") {
    console.error("[ERROR] Validation error:", {
      path: req.path,
      errors: err.errors
    })
    return res.status(400).json({ success: false, message: "Validation failed", data: { details: err.errors } })
  }

  if (err.statusCode) {
    console.error("[ERROR]", err.statusCode, err.message)
    return res.status(err.statusCode).json({ success: false, message: err.message, data: {} })
  }

  console.error("[ERROR] Unhandled error:", err)
  res.status(500).json({ success: false, message: "Internal server error", data: {} })
}
