import User from "../models/User.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import { ROLE_NAMES } from "../models/Role.js";
import { hashPassword } from "../lib/auth.js";

async function generateEmployeeId(role) {
  const prefix = role === "Intern" ? "INT" : "EMP";
  const existing = await User.find({ employeeId: new RegExp(`^${prefix}\\d+$`) })
    .select("employeeId")
    .lean();

  const maxNum = existing.reduce((max, u) => {
    const num = parseInt(u.employeeId.slice(prefix.length), 10);
    return Number.isFinite(num) ? Math.max(max, num) : max;
  }, 0);

  return `${prefix}${String(maxNum + 1).padStart(3, "0")}`;
}

function toDTO(user, profile) {
  return {
    id: user._id,
    employeeId: user.employeeId,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    phone: profile?.phone ?? null,
    monthlySalary: profile?.monthlySalary ?? null,
    joiningDate: profile?.joiningDate ?? null,
  };
}

export async function listEmployees(req, res) {
  const profiles = await EmployeeProfile.find().populate("user");
  const employees = profiles
    .filter((profile) => profile.user)
    .map((profile) => toDTO(profile.user, profile))
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId));

  res.json({ employees });
}

export async function createEmployee(req, res) {
  const { name, email, password, role, phone, monthlySalary, joiningDate } = req.body;

  if (!name || !email || !password || !role || !phone || monthlySalary == null || !joiningDate) {
    return res.status(400).json({ error: "All fields are required" });
  }
  if (!ROLE_NAMES.includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    const employeeId = await generateEmployeeId(role);
    const passwordHash = await hashPassword(password);
    const user = await User.create({
      employeeId,
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
    });
    const profile = await EmployeeProfile.create({
      user: user._id,
      phone,
      monthlySalary,
      joiningDate: new Date(joiningDate),
    });

    res.status(201).json({ employee: toDTO(user, profile) });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern ?? {})[0] ?? "field";
      return res.status(409).json({ error: `An employee with that ${field} already exists` });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateEmployee(req, res) {
  const { id } = req.params;
  const { name, email, role, isActive, phone, monthlySalary, joiningDate, password } = req.body;

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: "Employee not found" });

  if (role !== undefined && !ROLE_NAMES.includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  if (password && password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email.toLowerCase();
  if (role !== undefined) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (password) user.passwordHash = await hashPassword(password);

  try {
    await user.save();
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Email already in use" });
    }
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }

  const profileUpdate = {};
  if (phone !== undefined) profileUpdate.phone = phone;
  if (monthlySalary !== undefined) profileUpdate.monthlySalary = monthlySalary;
  if (joiningDate !== undefined) profileUpdate.joiningDate = new Date(joiningDate);

  const profile = await EmployeeProfile.findOneAndUpdate({ user: user._id }, profileUpdate, {
    returnDocument: "after",
  });

  res.json({ employee: toDTO(user, profile) });
}

export async function deleteEmployee(req, res) {
  const { id } = req.params;

  if (id === req.user.sub) {
    return res.status(400).json({ error: "You cannot delete your own account" });
  }

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ error: "Employee not found" });

  await EmployeeProfile.deleteOne({ user: user._id });
  await user.deleteOne();

  res.json({ ok: true });
}
