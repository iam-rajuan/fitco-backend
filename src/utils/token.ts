import { JwtPayload, Secret, SignOptions, sign, verify } from 'jsonwebtoken';
import config from '../config';
import { Role } from './constants';

export interface TokenPayload extends JwtPayload {
  sub: string;
  role: Role;
}

const accessOptions: SignOptions = { expiresIn: config.jwt.accessExpiresIn as SignOptions['expiresIn'] };
const refreshOptions: SignOptions = { expiresIn: config.jwt.refreshExpiresIn as SignOptions['expiresIn'] };

export const generateAccessToken = (payload: TokenPayload): string => {
  return sign(payload, config.jwt.accessSecret as Secret, accessOptions);
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return sign(payload, config.jwt.refreshSecret as Secret, refreshOptions);
};

export const verifyRefreshToken = (token: string): JwtPayload & TokenPayload => {
  return verify(token, config.jwt.refreshSecret as Secret) as JwtPayload & TokenPayload;
};
