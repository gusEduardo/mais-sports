import jwt from "jsonwebtoken";

const JWT_ISSUER = "mais-sports";
const JWT_ALGORITHMS = ["HS256"];

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("JWT_SECRET deve conter pelo menos 32 bytes.");
  }

  return secret;
}

export function createAccessToken(usuario) {
  const secret = getJwtSecret();

  return jwt.sign(
    { acesso: usuario.acesso },
    secret,
    {
      algorithm: "HS256",
      expiresIn: "1h",
      issuer: JWT_ISSUER,
      subject: String(usuario.id),
    },
  );
}

function unauthorized(res) {
  return res.status(401).json({
    ok: false,
    message: "Token não autorizado.",
  });
}

export function auth(req, res, next) {
  const authorization = req.get?.("authorization") || req.headers?.authorization;
  const match = /^Bearer\s+(\S+)$/i.exec(authorization || "");

  if (!match) {
    return unauthorized(res);
  }

  try {
    const payload = jwt.verify(match[1], getJwtSecret(), {
      algorithms: JWT_ALGORITHMS,
      issuer: JWT_ISSUER,
    });

    if (!payload || typeof payload !== "object" || typeof payload.sub !== "string") {
      return unauthorized(res);
    }

    req.user = {
      id: payload.sub,
      acesso: payload.acesso,
    };
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return unauthorized(res);
    }

    return next(error);
  }
}

export function authAdmin(req, res, next) {
  if (!req.user) {
    return unauthorized(res);
  }

  if (req.user.acesso !== "admin") {
    return res.status(403).json({
      ok: false,
      message: "Acesso não autorizado.",
    });
  }

  return next();
}

export function authOwnerOrAdmin(req, res, next) {
  if (!req.user) {
    return unauthorized(res);
  }

  if (req.user.acesso !== "admin" && req.user.id !== req.params.id) {
    return res.status(403).json({
      ok: false,
      message: "Acesso não autorizado.",
    });
  }

  return next();
}
