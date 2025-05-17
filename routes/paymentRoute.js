import finalising from "../prompt_processing/second_prompt.js"

import express from "express";

const router = express.Router();

router.post("/payment", async (req, res) => {

    try {
        const { paymentInfo } = req.body


    } catch (error) {
         console.log("Error in payment route", error);
        res.status(500).json({ message: "Internal server error" });
    }
})