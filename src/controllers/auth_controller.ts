import { Request, Response } from "express";
import { IAuthService } from "../services/auth_service_interface";

 export default class AuthController {
    authService: IAuthService;
    constructor(authService: IAuthService) {
        this.authService = authService;
    }

     registerWithGoogle = async (req: Request, res: Response) => {
        const {user, token} = await this.authService.registerWithGoogle(req.body);
        res.status(200).json({user, token})
    }

}
