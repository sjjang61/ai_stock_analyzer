import google.generativeai as genai
from app.llm.base import BaseLLMProvider, LLMResponse
from app.config import settings


class GeminiProvider(BaseLLMProvider):
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model_name = settings.GEMINI_MODEL

    @property
    def provider_name(self) -> str:
        return f"gemini/{self.model_name}"

    async def complete(
        self,
        prompt: str,
        system: str = "",
        max_tokens: int = 2000,
        temperature: float = 0.2,
    ) -> LLMResponse:
        gen_config = genai.GenerationConfig(
            max_output_tokens=max_tokens,
            temperature=temperature,
        )
        model = genai.GenerativeModel(
            model_name=self.model_name,
            generation_config=gen_config,
            system_instruction=system if system else None,
        )
        response = model.generate_content(prompt)
        text     = response.text

        input_tokens  = model.count_tokens(prompt).total_tokens
        output_tokens = model.count_tokens(text).total_tokens

        return LLMResponse(
            text=text,
            model=self.model_name,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )
