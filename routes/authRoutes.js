import express from "express";
import User from "../models/user.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const router = express.Router();

const generateToken = (email) => {
  return jwt.sign({ email: email }, process.env.JWT_SECRET);
};

const forgotPasswordToken = (email) => {
  return jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "10m" });
};

router.post("/signup", async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters long" });
    }

    if (username.length < 3) {
      return res
        .status(400)
        .json({ message: "Username must be at least 3 characters long" });
    }

    const existingEmail = await User.findOne({ email: email });

    if (existingEmail) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const user = new User({ username, email, password });

    await user.save();

    res.status(201).json({
      message: "User created successfully",
    });
  } catch (error) {
    console.log("Error in register route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email, password);

    if (!email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const user = await User.findOne({ email: email });

    console.log("Found user");

    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(email);
    console.log("done");

    res.status(200).json({
      token,
      user: {
        username: user.username,
        email: user.email,
        tokens: user.tokens,
        testUnlocked: user.testUnlocked,
      },
    });
  } catch (error) {
    console.log("Error in login route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/token", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ message: "Missing authorisation header" });
    }

    const token = authHeader.split(" ")[1];

    const verification = jwt.verify(token, process.env.JWT_SECRET);

    return res.status(200).json({ message: "Authorised" });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    } else return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/forgotPassword", async (req, res) => {
  try {
    const { email } = req.body;

    function getSixDigitRandom() {
      return Math.floor(100000 + Math.random() * 900000);
    }

    const code = getSixDigitRandom();
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.resetCode = code;
    user.resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
      },
    });

    (async () => {
      const info = await transporter.sendMail({
        from: {
          name: "Matura MK",
          address: process.env.EMAIL,
        },
        to: email,
        subject: "Your Password Reset Code for Matura MK",
        text: `Hello,

You recently requested a password reset for your Matura MK account.

Your password reset code is: ${code}

Please use this code on the password reset page to set a new password. THIS CODE IS VALID FOR THE NEXT 10 MINUTES.

If you did not request a password reset, please ignore this email. Do not share this code with anyone.

Thank you,
The Matura MK Team
`,
        html: `
<div style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
    <h2 style="color: #0056b3; text-align: center; margin-bottom: 20px;">Password Reset Request</h2>
    <p>Hello,</p>
    <p>You recently requested a password reset for your Matura MK account. Please use the following code to reset your password:</p>
    <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
        <p style="font-size: 24px; font-weight: bold; color: #0056b3; margin: 0;">CODE: ${code}</p>
    </div>
    <p>THIS CODE IS VALID FOR THE NEXT 10 MINUTES. Please return to the password reset page and enter this code to set a new password.</p>
    <p style="font-size: 0.9em; color: #777;">
        If you did not request a password reset, please ignore this email. For your security, do not share this code with anyone.
    </p>
    <p style="margin-top: 30px; text-align: center; color: #555;">
        Thank you,<br>
        The Matura MK Team
    </p>
    <p style="font-size: 0.8em; text-align: center; color: #aaa; margin-top: 20px;">
        This is an automated email, please do not reply.
    </p>
</div>
`,
      });

      console.log("Message sent");
    })();

    return res.status(200).json({ message: "Code sent, check your email" });
  } catch (error) {
    console.log("Error in forgotPassword route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/verifyCode", async (req, res) => {
  try {
    const { code, email } = req.body;

    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(401).json({ message: "Invalid code or email." });
    }

    const token = forgotPasswordToken(email);

    const isValidCode = await user.compareCode(code);

    if (!isValidCode) return res.status(401).json({ message: "Invalid code" });

    return res.status(200).json({ token, message: "Valid Token" });
  } catch (error) {
    console.log("Error in verifyCode route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/changePassword", async (req, res) => {
  try {
    const { newPassword, email } = req.body;

    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ message: "Missing authorisation header" });
    }

    const token = authHeader.split(" ")[1];

    const verification = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({ email: email });
    user.$set({
      password: newPassword,
    });
    await user.save();

    return res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.log("Error in changePassword route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
