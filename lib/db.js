import mongoose, { mongo } from "mongoose";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log("Database connected " + conn.connection.host);
  } catch (error) {
    console.log("connection failed");
    process.exit(1);
  }
};
