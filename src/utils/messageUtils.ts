const mensagensSucessoPedido = [
  "Seu pedido foi realizado com super ultra sucesso! Prepare os ouvidos!",
  "Missão dada é missão cumprida! Seu pedido de locução está a caminho.",
  "Uhuul! Seu pedido chegou aqui voando. Em breve, uma obra de arte sonora para você!",
  "Recebemos seu pedido! Nossa equipe já está esquentando os microfones (e as cordas vocais)!",
  "É isso aí! Pedido confirmado. Agora é só aguardar a mágica acontecer.",
  "Prontinho! Seu pedido foi anotado com carinho e já está na fila de produção.",
  "Que demais! Seu pedido foi enviado com sucesso. A contagem regressiva para sua locução incrível começou!",
  "Booyah! Pedido no sistema. Agora é com a gente!",
  "Anotado! Seu pedido de locução foi recebido e será tratado como VIP.",
  "Sucesso! Sua solicitação de locução foi registrada. Mal podemos esperar para te surpreender!",
  "Ok, seu pedido está no forninho! Logo mais, uma locução quentinha e no capricho para você.",
  "Confirmado! Enquanto você toma um café, a gente começa a dar voz ao seu projeto."
];

export const obterMensagemSucessoAleatoria = (): string => {
  const indiceAleatorio = Math.floor(Math.random() * mensagensSucessoPedido.length);
  return mensagensSucessoPedido[indiceAleatorio];
}; 