import UserService from "@repo/services/user";
import AuthService from "@repo/services/auth";
import VisitorService from "@repo/services/visitor";
import ResidentService from "@repo/services/resident";

export const userService = new UserService();
export const authService = new AuthService();
export const visitorService = new VisitorService();
export const residentService = new ResidentService();
