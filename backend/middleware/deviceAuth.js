module.exports = (req, res, next) => {
  const apiKey = req.header("x-api-key");

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: "API Key Missing",
    });
  }

  if (apiKey !== process.env.DEVICE_API_KEY) {
    return res.status(403).json({
      success: false,
      message: "Invalid API Key",
    });
  }

  next();
};
