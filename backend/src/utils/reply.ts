import type { FastifyReply } from "fastify";
import { string } from "zod";

export function ok<T>(reply: FastifyReply, data: T, msg = "ok") {
  return reply.send({
    code: 0,
    data,
    msg,
  });
}

export function fail(reply: FastifyReply, code: number, msg: string) {
  return reply.status(code).send({
    code,
    msg,
    data: null,
  });
}
