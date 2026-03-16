import anthropic
from app.llm.base import BaseLLMProvider, LLMResponse
from app.config import settings


class AnthropicProvider(BaseLLMProvider):
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model  = settings.ANTHROPIC_MODEL

    @property
    def provider_name(self) -> str:
        return f"anthropic/{self.model}"

    async def complete(
        self,
        prompt: str,
        system: str = "",
        max_tokens: int = 2000,
        temperature: float = 0.2,
    ) -> LLMResponse:
        msgs = [{"role": "user", "content": prompt}]
        kwargs = dict(model=self.model, max_tokens=max_tokens, messages=msgs)
        if system:
            kwargs["system"] = system

        res = self.client.messages.create(**kwargs)
        return LLMResponse(
            text=res.content[0].text,
            model=self.model,
            input_tokens=res.usage.input_tokens,
            output_tokens=res.usage.output_tokens,
        )
