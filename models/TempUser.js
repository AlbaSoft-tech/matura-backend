import mongoose from "mongoose";
import bcrypt from "bcrypt";

const tempUserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    signUpCode: {
      type: Number,
      required: true,
    },
    expireAt: {
      type: Date,
      default: () => Date.now() + 10 * 60 * 1000, // 10 minutes from creation
      expires: 0, // TTL index, auto-delete at expireAt
    },
  },
  { timestamps: true }
);

// hash password before saving
tempUserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

tempUserSchema.methods.comparePassword = async function (userPassword) {
  return await bcrypt.compare(userPassword, this.password);
};

const TempUser = mongoose.model("TempUser", tempUserSchema);

export default TempUser;
