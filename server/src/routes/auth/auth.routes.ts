import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { clerkClient, getAuth } from "@clerk/express";
import { AppError } from "../../utils/appError";
import { User } from "../../models/User";
import { ok } from "../../utils/envelope";
export const authRouter = Router();
authRouter.post(
  "/sync",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) {
      throw new AppError(
        401,
        "User is not logged in.Means unauthenticated user",
      );
    }
    const clerkUser = await clerkClient.users.getUser(userId);
    const extractEmailFromUserInfo =
      clerkUser.emailAddresses.find(
        (item) => item.id === clerkUser.primaryEmailAddressId,
      ) || clerkUser.emailAddresses[0];
    const email = extractEmailFromUserInfo.emailAddress;
    const fullName = [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join("")
      .trim();
    const name = fullName || clerkUser.username;
    const raw = process.env.ADMIN_EMAIL || "";
    const adminEmails = new Set(
      raw
        .split(",")
        .map((item) => item.trim().toLocaleLowerCase())
        .filter(Boolean),
    );
    //if the current user is existing user or not
    const existingUser = await User.findOne({ clerkUserId: userId });
    const shouldBeAdmin = email
      ? adminEmails.has(email.toLocaleLowerCase())
      : false;
    const nextRole =
      existingUser?.role === "admin"
        ? "admin"
        : shouldBeAdmin
          ? "admin"
          : existingUser?.role || "user";
    const newelyCreatedDbUser = await User.findByIdAndUpdate(
      {
        clerkUserId: userId,
      },
      {
        clerkUserId: userId,
        email,
        name,
        role: nextRole,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    res.status(200).json(
      ok({
        user: {
          id: newelyCreatedDbUser._id,
          clerkUserId: newelyCreatedDbUser.clerkUserId,
          email: newelyCreatedDbUser.email,
          name: newelyCreatedDbUser.name,
          role: newelyCreatedDbUser.role,
        },
      }),
    );
  }),
);
authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    if (!userId) {
      throw new AppError(
        401,
        "User is not logged in.Means unauthenticated user",
      );
    }
    const dbUser = await User.findOne({ clerkUserId: userId });
    if (!dbUser) {
      throw new AppError(404, "User is not found in DB");
    }
    res.status(200).json(
      ok({
        user: {
          id: dbUser._id,
          clerkUserId: dbUser.clerkUserId,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
        },
      }),
    );
  }),
);
