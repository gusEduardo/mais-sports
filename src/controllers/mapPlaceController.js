import mapPlaceRepository from "../repositories/mapPlaceRepository.js";

const SUPPORTED_SPORTS = new Set([
  "society",
  "futebol",
  "volei",
  "basquete",
  "tenis",
  "raquete",
  "corrida",
  "natacao",
  "ciclismo",
]);
const SUPPORTED_STATUSES = new Set(["available", "reserve", "unavailable"]);

export function validarQuadra(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Dados da quadra inválidos." };
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const sport = typeof body.sport === "string" ? body.sport : "";
  const type = typeof body.type === "string" ? body.type.trim() : "";
  const status = typeof body.status === "string" ? body.status : "";
  const address = typeof body.address === "string" ? body.address.trim() : "";
  const latitude = body.latitude;
  const longitude = body.longitude;

  if (!title || title.length > 120 || !SUPPORTED_SPORTS.has(sport)
      || !type || type.length > 80 || !SUPPORTED_STATUSES.has(status)
      || !address || address.length > 240) {
    return { error: "Preencha os campos da quadra com valores válidos." };
  }

  if (typeof latitude !== "number" || !Number.isFinite(latitude)
      || latitude < -90 || latitude > 90
      || typeof longitude !== "number" || !Number.isFinite(longitude)
      || longitude < -180 || longitude > 180) {
    return { error: "Selecione uma localização válida no mapa." };
  }

  return {
    value: { title, sport, sportKey: sport, type, status, address, latitude, longitude },
  };
}

function getPlaceId(value) {
  const match = /^db-(\d+)$/.exec(value);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

const mapPlaceController = {
  async listar(req, res, next) {
    try {
      res.json(await mapPlaceRepository.listar());
    } catch (error) {
      next(error);
    }
  },

  async criar(req, res, next) {
    const validated = validarQuadra(req.body);
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    try {
      const place = await mapPlaceRepository.criar(validated.value);
      return res.status(201).json(place);
    } catch (error) {
      return next(error);
    }
  },

  async atualizar(req, res, next) {
    const id = getPlaceId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "Identificador da quadra inválido." });
    }

    const validated = validarQuadra(req.body);
    if (validated.error) {
      return res.status(400).json({ message: validated.error });
    }

    try {
      const place = await mapPlaceRepository.atualizar(id, validated.value);
      if (!place) {
        return res.status(404).json({ message: "Quadra não encontrada." });
      }
      return res.json(place);
    } catch (error) {
      return next(error);
    }
  },
};

export default mapPlaceController;
