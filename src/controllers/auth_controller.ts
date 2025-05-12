import { Request, Response } from "express";
import { IAuthService } from "../services/auth_service_interface";

import { StatusCodes } from "http-status-codes";

export default class AuthController {
    authService: IAuthService;
    constructor(authService: IAuthService) {
        this.authService = authService;
    }

    registerWithGoogle = async (req: Request, res: Response) => {
        try {
            const { user, token } = await this.authService.registerWithGoogle(req.body);
            res.status(StatusCodes.ACCEPTED).json({ result: [user], access_token:token })
        } catch (err: any) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: err.message });
        }
    }

}
