import express from "express";
import User from "../models/user.js";
import jwt from "jsonwebtoken";

const router = express.Router();

const generateToken = (userId, username, email) => {
  return jwt.sign(
    { userId, username, email },  
    process.env.JWT_SECRET
  );
};


router.post("/signup", async (req, res) => {
  try {

    const { username, email, password } = req.body;

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


    const user = new User({username, email, password});

    await user.save();


    const token = generateToken(user._id);


    res.status(201).json({
      token,
      user: {
        username: user.username,
      },
    });
  } catch (error) {
    console.log("Error in register route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const user = await User.findOne({ email: email });

    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: {
        username: user.username,
      },
    });
  } catch (error) {
    console.log("Error in login route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/token", async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({message: 'Missing authorisation header'});
  }

  const token = authHeader.split(" ")[1]

  const verification = jwt.verify(token, process.env.JWT_SECRET)

  if(!verification){
    return res.status(401).json({message: 'Invalid token'});
  }

  return res.status(200).json({message: "Authorised" })


  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
       
      return res.status(401).json({ message: 'Invalid token' });
    } else return res.status(500).json({ error: 'Internal server error' });
  }

})

export default router;
