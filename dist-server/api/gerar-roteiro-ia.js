"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
// Para configurar o modelo Gemini, adicione no seu .env:
// GEMINI_MODEL=gemini-2.5-flash-preview-05-20
// GEMINI_API_KEY=xxxx
function handler(req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, nomeProjetoIA, objetivoAudioIA, objetivoAudioOutroIA, publicoAlvoIA, produtoTemaIA, beneficioPrincipalIA, pontosChaveIA, estiloLocucaoIA, estiloLocucaoOutroIA, tomMensagemIA, duracaoAlvoIA, duracaoAlvoOutraIA, callToActionIA, evitarIA, destacarIA, referenciasIA, infoAdicionalIA, prompt, geminiApiKey, geminiModel, geminiRes, geminiData, roteiro, error_1;
        var _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    if (req.method !== 'POST') {
                        return [2 /*return*/, res.status(405).json({ success: false, error: 'Método não permitido' })];
                    }
                    _a = req.body, nomeProjetoIA = _a.nomeProjetoIA, objetivoAudioIA = _a.objetivoAudioIA, objetivoAudioOutroIA = _a.objetivoAudioOutroIA, publicoAlvoIA = _a.publicoAlvoIA, produtoTemaIA = _a.produtoTemaIA, beneficioPrincipalIA = _a.beneficioPrincipalIA, pontosChaveIA = _a.pontosChaveIA, estiloLocucaoIA = _a.estiloLocucaoIA, estiloLocucaoOutroIA = _a.estiloLocucaoOutroIA, tomMensagemIA = _a.tomMensagemIA, duracaoAlvoIA = _a.duracaoAlvoIA, duracaoAlvoOutraIA = _a.duracaoAlvoOutraIA, callToActionIA = _a.callToActionIA, evitarIA = _a.evitarIA, destacarIA = _a.destacarIA, referenciasIA = _a.referenciasIA, infoAdicionalIA = _a.infoAdicionalIA;
                    // Validação mínima dos principais campos obrigatórios
                    if (!objetivoAudioIA || !publicoAlvoIA || !produtoTemaIA || !beneficioPrincipalIA || !pontosChaveIA || !estiloLocucaoIA || !tomMensagemIA || !duracaoAlvoIA || !callToActionIA) {
                        return [2 /*return*/, res.status(400).json({ success: false, error: 'Campos obrigatórios ausentes.' })];
                    }
                    prompt = "Voc\u00EA \u00E9 um redator publicit\u00E1rio especialista em \u00E1udio. Crie um roteiro de locu\u00E7\u00E3o para o seguinte briefing, considerando todas as informa\u00E7\u00F5es fornecidas. Seja criativo, objetivo e siga as instru\u00E7\u00F5es do cliente.\n\n";
                    if (nomeProjetoIA)
                        prompt += "Nome do Projeto/Campanha: ".concat(nomeProjetoIA, "\n");
                    prompt += "Objetivo: ".concat(objetivoAudioIA).concat(objetivoAudioIA === 'Outro' && objetivoAudioOutroIA ? " (".concat(objetivoAudioOutroIA, ")") : '', "\n");
                    prompt += "P\u00FAblico-alvo: ".concat(publicoAlvoIA, "\n");
                    prompt += "Produto/Servi\u00E7o/Evento/Tema: ".concat(produtoTemaIA, "\n");
                    prompt += "Benef\u00EDcio Principal/Diferencial: ".concat(beneficioPrincipalIA, "\n");
                    prompt += "Informa\u00E7\u00F5es Essenciais: ".concat(pontosChaveIA, "\n");
                    prompt += "Estilo de Locu\u00E7\u00E3o: ".concat(estiloLocucaoIA === 'outro' && estiloLocucaoOutroIA ? "Outro (".concat(estiloLocucaoOutroIA, ")") : estiloLocucaoIA, "\n");
                    prompt += "Tom da Mensagem: ".concat(tomMensagemIA, "\n");
                    prompt += "Dura\u00E7\u00E3o Alvo: ".concat(duracaoAlvoIA).concat(duracaoAlvoIA === 'Outra' && duracaoAlvoOutraIA ? " (".concat(duracaoAlvoOutraIA, ")") : '', "\n");
                    prompt += "Call to Action: ".concat(callToActionIA, "\n");
                    if (evitarIA)
                        prompt += "Evitar: ".concat(evitarIA, "\n");
                    if (destacarIA)
                        prompt += "Slogan/URL/Contato a destacar: ".concat(destacarIA, "\n");
                    if (referenciasIA)
                        prompt += "Refer\u00EAncias de estilo: ".concat(referenciasIA, "\n");
                    if (infoAdicionalIA)
                        prompt += "Informa\u00E7\u00F5es adicionais: ".concat(infoAdicionalIA, "\n");
                    prompt += "\nO roteiro deve ser direto, criativo, adequado ao p\u00FAblico e ao objetivo, e conter a chamada para a\u00E7\u00E3o no final.\n\nRoteiro:";
                    _g.label = 1;
                case 1:
                    _g.trys.push([1, 4, , 5]);
                    geminiApiKey = process.env.GEMINI_API_KEY;
                    geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
                    if (!geminiApiKey) {
                        return [2 /*return*/, res.status(500).json({ success: false, error: 'Chave da API Gemini não configurada.' })];
                    }
                    return [4 /*yield*/, fetch("https://generativelanguage.googleapis.com/v1beta/models/".concat(geminiModel, ":generateContent?key=").concat(geminiApiKey), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                                generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
                            }),
                        })];
                case 2:
                    geminiRes = _g.sent();
                    return [4 /*yield*/, geminiRes.json()];
                case 3:
                    geminiData = _g.sent();
                    roteiro = (_f = (_e = (_d = (_c = (_b = geminiData === null || geminiData === void 0 ? void 0 : geminiData.candidates) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.parts) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.text;
                    if (roteiro) {
                        return [2 /*return*/, res.status(200).json({ success: true, roteiro: roteiro })];
                    }
                    else {
                        return [2 /*return*/, res.status(500).json({ success: false, error: 'Não foi possível gerar o roteiro.' })];
                    }
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _g.sent();
                    return [2 /*return*/, res.status(500).json({ success: false, error: error_1.message || 'Erro ao chamar a IA.' })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
//# sourceMappingURL=gerar-roteiro-ia.js.map