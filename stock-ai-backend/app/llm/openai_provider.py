from openai import AsyncOpenAI
from app.llm.base import BaseLLMProvider, LLMResponse
from app.config import settings


class OpenAIProvider(BaseLLMProvider):
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model  = settings.OPENAI_MODEL

    @property
    def provider_name(self) -> str:
        return f"openai/{self.model}"

    async def complete(
        self,
        prompt: str,
        system: str = "",
        max_tokens: int = 2000,
        temperature: float = 0.2,
    ) -> LLMResponse:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        res = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return LLMResponse(
            text=res.choices[0].message.content,
            model=self.model,
            input_tokens=res.usage.prompt_tokens,
            output_tokens=res.usage.completion_tokens,
        )
