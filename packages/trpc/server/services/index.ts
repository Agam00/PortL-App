import UserService from "@repo/services/user";
import AuthService from "@repo/services/auth";
import VisitorService from "@repo/services/visitor";

export const userService = new UserService();
export const authService = new AuthService();
export const visitorService = new VisitorService();
