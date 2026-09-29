---
unidade: ime
disciplina: Aprendizado de Máquina
aula: 4
data: 2026-09-14
professor: Prof. Renato Vicente
---

# Descida do gradiente | como um modelo aprende

## abertura: Intuição
? Como um modelo descobre sozinho para que lado mexer os pesos?

## conteudo: O erro é uma paisagem | e o treino desce por ela. {#superficie}
> Cada escolha de pesos tem um erro, e essas alturas juntas formam uma superfície.

Treinar é procurar o fundo dessa superfície sem poder enxergá-la inteira. Do ponto onde está, o modelo conhece a altura e a inclinação sob os pés, e nada além disso.

[destaque: Definição] Superfície de erro: a altura \( E(w) \) sobre cada escolha de pesos \( w \).
nota: Desenhar um vale no quadro e pôr um ponto no alto da encosta. A turma costuma chegar sozinha ao "desça por onde é mais íngreme", e a conta do próximo slide só formaliza o que já foi dito.

## conteudo: O gradiente aponta | sempre para cima. {#gradiente}
> O gradiente reúne as inclinações parciais e aponta a direção de subida mais rápida.
$$ \nabla E(w) = \left( \frac{\partial E}{\partial w_1}, \ldots, \frac{\partial E}{\partial w_n} \right) $$
Descer, então, é andar no sentido contrário. A promessa vale só na vizinhança do ponto: alguns passos adiante a inclinação já pode ser outra.
nota: Ler a fórmula devagar, uma derivada parcial por vez. O índice assusta mais do que a ideia, e quem já viu derivada em uma variável reconhece a conta.

## abertura: A regra {#regra}
? Quanto andar, e em que sentido, depois de medir a inclinação?

## conteudo: Da distância ao alvo | até a regra de ajuste. {#derivacao}
1. O erro mede a distância ao alvo, na média sobre os \(N\) exemplos: \( E(w) = \tfrac{1}{2N} \sum_{i=1}^{N} (y_i - \hat{y}_i(w))^2 \).
2. + Derive em relação ao peso: \( \nabla E(w) = -\tfrac{1}{N} \sum_{i=1}^{N} (y_i - \hat{y}_i)\,\nabla \hat{y}_i(w) \).
3. + O gradiente aponta a subida, então ande no sentido oposto.
4. + A regra, com a taxa de aprendizado \( \eta \): \( w \leftarrow w - \eta\,\nabla E(w) \).
nota: Revelar um passo por vez. A troca de sinal do terceiro item é onde a turma tropeça: vale parar e perguntar para que lado anda o peso antes de mostrar a regra.

## conteudo: O tamanho do passo | decide o resultado. {#taxa}
> A taxa de aprendizado \( \eta \) controla quanto da inclinação medida vira movimento.
:::colunas 6-6
Com passo curto, a queda tende a ser lenta e regular, e o modelo gasta muitos passos para chegar perto do fundo.
---
[alerta: Cuidado] Passo longo demais atravessa o vale, e o erro sobe em vez de cair.
Na prática, o valor sai de tentativa e erro.
:::
nota: Desenhar as duas trajetórias lado a lado, a que desliza até o fundo e a que salta de uma encosta à outra. O contraste fixa melhor do que a definição.

## abertura: Na prática {#pratica}
? Como essa conta vira um laço que roda?

## conteudo: O método inteiro | cabe num laço. {#codigo}
> Cada volta do laço mede o erro, calcula o gradiente e move os pesos.
```python
def descida(w, X, y, eta=0.1, passos=100):
    """Descida do gradiente para o erro quadrático."""
    for _ in range(passos):
        erro = y - X @ w
        grad = -X.T @ erro / len(y)
        w = w - eta * grad
    return w


w = descida(np.zeros(X.shape[1]), X, y)
print(f"pesos: {w}")
```
nota: A taxa e o número de passos são escolhas de quem chama a função; o miolo é a conta da derivação. A divisão por len(y) é a média sobre todos os exemplos: a descida em lote. Rodar ao vivo e mexer em eta rende mais do que explicar.

## encerramento: O que fica
- O erro é uma superfície, e treinar é descer por ela.
- O gradiente aponta a subida; o passo anda no sentido oposto.
- A taxa regula o tamanho do passo, e o passo decide se o erro cai.
próxima: por que um punhado de exemplos já estima bem o gradiente.
