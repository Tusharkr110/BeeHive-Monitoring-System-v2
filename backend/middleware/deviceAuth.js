// module.exports = (req, res, next) => {
//   const apiKey = req.header("x-api-key");

//   if (!apiKey) {
//     return res.status(401).json({
//       success: false,
//       message: "API Key Missing",
//     });
//   }

//   if (apiKey !== process.env.DEVICE_API_KEY) {
//     return res.status(403).json({
//       success: false,
//       message: "Invalid API Key",
//     });
//   }

//   next();
// };

module.exports = (req, res, next) => {
  console.log("========== DEVICE AUTH ==========");
  console.log("Headers:", req.headers);

  const apiKey = req.header("x-api-key");

  console.log("Received API Key:", apiKey);
  console.log("Expected API Key:", process.env.DEVICE_API_KEY);

  if (!apiKey) {
    console.log("❌ API KEY MISSING");
    return res.status(401).json({
      success: false,
      message: "API Key Missing",
    });
  }

  if (apiKey !== process.env.DEVICE_API_KEY) {
    console.log("❌ INVALID API KEY");
    return res.status(403).json({
      success: false,
      message: "Invalid API Key",
    });
  }

  console.log("✅ DEVICE AUTH SUCCESS");
  next();
};