import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

export const insecureRequest = httpRequest;
export const secureRequest = httpsRequest;
