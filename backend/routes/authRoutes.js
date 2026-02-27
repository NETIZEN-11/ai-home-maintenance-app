const express = require("express")
const router = express.Router()

const { register, login } = require("../controllers/authController")
const { validateRegister, validateLogin } = require("../middleware/validation")
const authRateLimiter = require("../middleware/authRateLimiter")

const authLimiter = authRateLimiter(900000, 5) // 5 attempts per 15 minutes

router.post("/register", authLimiter, validateRegister, register)
router.post("/login", authLimiter, validateLogin, login)

module.exports = router