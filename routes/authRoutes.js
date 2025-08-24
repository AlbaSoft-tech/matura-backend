import express from "express";
import User from "../models/user.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import testeShqip from "../tests/testeShqip.json" with { type: "json" };
import englishTests from "../tests/englishTests.json" with { type: "json" };
import testeMaqedonisht from "../tests/testeMaqedonisht.json" with { type: "json" };
import testeTurqisht from "../tests/testeTurqisht.json" with { type: "json" };
import bosnianTests from "../tests/bosnian.json" with { type: "json" };
import montenegrinTests from "../tests/montenegrin.json" with {type: "json" };
import serbianTests from "../tests/serbian.json" with { type: "json" };
import bulgarianTests from "../tests/bulgarian.json" with { type: "json" };

const router = express.Router();

const generateToken = (email) => {
  return jwt.sign({ email: email }, process.env.JWT_SECRET);
};

const forgotPasswordToken = (email) => {
  return jwt.sign({ email: email }, process.env.JWT_FORGOT_SECRET, {
    expiresIn: "10m",
  });
};
const signUpToken = (username, email, password) => {
  return jwt.sign({email: email, username: username, password: password}, process.env.JWT_SIGNUP_SECRET, {
    expiresIn: "10m",})
}

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
    const signupToken = signUpToken(username, email, password);

  function getSixDigitRandom() {
      return Math.floor(100000 + Math.random() * 900000);
    }

    const code = getSixDigitRandom();

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
          name: "Matura ",
          address: process.env.EMAIL,
        },
        to: email,
        subject: "Your account verification code for Matura",
        text: `Hello,

Thank you for creating an account with Matura.

Please use the following code to verify your email address: ${code}

This code is valid for the next 10 minutes. Please return to the app and enter this code to complete your account setup.

If you did not create an account, please ignore this email. Do not share this code with anyone.

Thank you,
The Matura Team
`,
        html: `
<div style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
    <h2 style="color: #0056b3; text-align: center; margin-bottom: 20px;">Email Verification</h2>
    <p>Hello,</p>
    <p>Thank you for signing up with Matura. To complete your account registration, please enter the following verification code in the app:</p>
    <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
        <p style="font-size: 24px; font-weight: bold; color: #0056b3; margin: 0;">CODE: ${code}</p>
    </div>
    <p>This code is valid for the next 10 minutes. Please return to the app and enter this code to verify your email address.</p>
    <p style="font-size: 0.9em; color: #777;">
        If you did not create an account, please ignore this email. For your security, do not share this code with anyone.
    </p>
    <p style="margin-top: 30px; text-align: center; color: #555;">
        Thank you,<br>
        The Matura Team
    </p>
    <p style="font-size: 0.8em; text-align: center; color: #aaa; margin-top: 20px;">
        This is an automated email, please do not reply.
    </p>
</div>
`,
      });

      console.log("Message sent");
    })();

    const user = new User({ username, email, password, signUpCode: code});

    await user.save();

    res.status(201).json({
      message: "User registered successfully, verify your email to continue",
      token: signupToken,
    });
  } catch (error) {
    console.log("Error in Signup route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/verifyAccount", async (req, res) => {
  try {
    const {code} = req.body;
    console.log(code)
    if(!code) {
      return res.status(400).json({message: "Code is required"});
    }

    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ message: "Missing authorisation header" });
    }

    const token = authHeader.split(" ")[1];

    let decoded = jwt.verify(token, process.env.JWT_SIGNUP_SECRET);

    const tempUser = await User.findOne({ email: decoded.email });
    console.log("found user")

    if((String(code) !== String(tempUser.signUpCode))) { return res.status(400).json({message: "Invalid code"}); }

    tempUser.signUpCode = null; 
    tempUser.expireAt = undefined;

    await tempUser.save();

    res.status(201).json({
      message: "User created successfully"
    });
  } catch (error) {
    console.log("Error in verifyAccount route", error);
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

    if(user.signUpCode){
      return res.status(400).json({message: "Please verify your email to continue"});
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(email);
    const tests = {
        albanian: testeShqip,
        turkish: testeTurqisht,
        english: englishTests,
        macedonian: testeMaqedonisht,
        montenegrin: montenegrinTests,
        bosnian: bosnianTests,
        serbian: serbianTests,
        bulgarian: bulgarianTests,
    
      }
      
    console.log("sending tests: " + tests)

    res.status(200).json({
      token,
      user: {
        username: user.username,
        email: user.email,
        tokens: user.tokens,
        testUnlocked: user.testUnlocked,
        completedTests: user.completedTests,
      },
      tests: tests,
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

    let decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;
    const user = await User.findOne({ email: email });

     if(user.signUpCode){
      return res.status(400).json({message: "Please verify your email to continue"});
    }

    return res
      .status(200)
      .json({
        message: "Authorised",
        completedTests: user.completedTests,
        testUnlocked: user.testUnlocked,
        tokens: user.tokens,
      });
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
          name: "Matura ",
          address: process.env.EMAIL,
        },
        to: email,
        subject: "Your Password Reset Code for Matura",
        text: `Hello,

You recently requested a password reset for your Matura account.

Your password reset code is: ${code}

Please use this code on the password reset page to set a new password. THIS CODE IS VALID FOR THE NEXT 10 MINUTES.

If you did not request a password reset, please ignore this email. Do not share this code with anyone.

Thank you,
The Matura Team
`,
        html: `
<div style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
    <h2 style="color: #0056b3; text-align: center; margin-bottom: 20px;">Password Reset Request</h2>
    <p>Hello,</p>
    <p>You recently requested a password reset for your Matura account. Please use the following code to reset your password:</p>
    <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
        <p style="font-size: 24px; font-weight: bold; color: #0056b3; margin: 0;">CODE: ${code}</p>
    </div>
    <p>THIS CODE IS VALID FOR THE NEXT 10 MINUTES. Please return to the password reset page and enter this code to set a new password.</p>
    <p style="font-size: 0.9em; color: #777;">
        If you did not request a password reset, please ignore this email. For your security, do not share this code with anyone.
    </p>
    <p style="margin-top: 30px; text-align: center; color: #555;">
        Thank you,<br>
        The Matura Team
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
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    return res.status(200).json({ token: token, message: "Valid Token" });
  } catch (error) {
    console.log("Error in verifyCode route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/changePassword", async (req, res) => {
  try {
    const { newPassword } = req.body;

    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ message: "Missing authorisation header" });
    }

    const token = authHeader.split(" ")[1];

    let decoded = jwt.verify(token, process.env.JWT_FORGOT_SECRET);

    const user = await User.findOne({ email: decoded.email });
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

router.post("/delete", async (req, res) => {
  try {
    console.log("deleting account")
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ message: "Missing authorisation header" });
    }

    const token = authHeader.split(" ")[1];

    let decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({ email: decoded.email });

if (!user) {
  return res.status(404).json({ message: "User not found" });
}

await user.deleteOne();

return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.log("Error in delete route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/amend", async (req, res) => {
  try {
    const {info} = req.body;
    console.log(info)
    if(!info){
      return res.status(400).json({message: "Type is required"});
    }
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ message: "Missing authorisation header" });
    }

    const token = authHeader.split(" ")[1];

    let decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findOne({ email: decoded.email });

    if(info.type === "username"){
      if(info.username.length < 3){
        return res.status(400).json({message: "Username must be at least 3 characters long"});
      }
      user.username = info.username;
    }
    if(info.type === "password"){
      console.log("changing password")
      if(info.value.length < 8){
        return res.status(400).json({message: "Password must be at least 8 characters long"});
      }
      const isSamePassword = await user.comparePassword(info.newPassword);
      if(isSamePassword){
        return res.status(400).json({message: "New password must be different from the old one"});
      }
      const correctPassword = await user.comparePassword(info.oldPassword);
      if(!correctPassword){
        return res.status(400).json({message: "Old password is incorrect"});
      }
      user.password = info.newPassword;
    }
    if(info.type === "email"){
      console.log("sending email")
      const existingEmail = await User.findOne({ email: info.value });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }
        function getSixDigitRandom() {
      return Math.floor(100000 + Math.random() * 900000);
    }

    const code = getSixDigitRandom();
    console.log(info.value)
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
      const sendEmail = await transporter.sendMail({
        from: {
          name: "Matura ",
          address: process.env.EMAIL,
        },
        to: info.value,
        subject: "Your account verification code for Matura",
        text: `Hello,

You have requested to change the email address associated with your Matura account.

To confirm this change, please use the following code: ${code}

This code is valid for the next 10 minutes. Please return to the app and enter this code to complete the email update.

If you did not request to change your email address, please ignore this email. Do not share this code with anyone.

Thank you,
The Matura Team
`,
        html: `
<div style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
    <h2 style="color: #0056b3; text-align: center; margin-bottom: 20px;">Email Address Change Request</h2>
    <p>Hello,</p>
    <p>You have requested to change the email address associated with your Matura account. To confirm this change, please enter the following verification code in the app:</p>
    <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
        <p style="font-size: 24px; font-weight: bold; color: #0056b3; margin: 0;">CODE: ${code}</p>
    </div>
    <p>This code is valid for the next 10 minutes. Please return to the app and enter this code to complete the email update.</p>
    <p style="font-size: 0.9em; color: #777;">
        If you did not request to change your email address, please ignore this email. For your security, do not share this code with anyone.
    </p>
    <p style="margin-top: 30px; text-align: center; color: #555;">
        Thank you,<br>
        The Matura Team
    </p>
    <p style="font-size: 0.8em; text-align: center; color: #aaa; margin-top: 20px;">
        This is an automated email, please do not reply.
    </p>
</div>
`,
      });

      console.log("Message sent");
    })();


      user.email = info.value;
      user.expireAt = new Date(Date.now() + 10 * 60 * 1000);
      user.changeEmailCode = code;
    }
    

    await user.save();
    return res.status(200).json({message: "User info updated successfully"});
  } catch (error)
      
   {
    console.log("Error in amend route", error);
    return res.status(500).json({ message: "Internal server error" });
  }

})

router.post("/verifyNewAccount", async (req, res) => {
  try {
    const {code} = req.body;
    console.log(code)
    if(!code) {
      return res.status(400).json({message: "Code is required"});
    }

    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ message: "Missing authorisation header" });
    }

    const token = authHeader.split(" ")[1];

    let decoded = jwt.verify(token, process.env.JWT_SECRET);

    const tempUser = await User.findOne({ email: decoded.email });
    console.log("found user")

    if(String(code) !== String(tempUser.changeEmailCode)) { return res.status(400).json({message: "Invalid code"}); }

    tempUser.changeEmailCode = null; 
    tempUser.expireAt = undefined;

    await tempUser.save();
    const newToken = generateToken(tempUser.email);

    res.status(201).json({
      message: "Email updated successfully", token: newToken, email: tempUser.email  });
  } catch (error) {
    console.log("Error in verifyNewAccount route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
