from functools import lru_cache
from app.config import settings
from app.llm.base import BaseLLMProvider


@lru_cache(maxsize=1)
def get_llm_provider() -> BaseLLMProvider:
    """
    LLM_TYPE 환경변수에 따라 적절한 LLM 어댑터를 반환한다.

    .env:
        LLM_TYPE=anthropic   → AnthropicProvider (Claude)
        LLM_TYPE=openai      → OpenAIProvider    (GPT-4o)
        LLM_TYPE=gemini      → GeminiProvider    (Gemini 1.5 Pro)
    """
    llm_type = settings.LLM_TYPE.lower()

    if llm_type == "anthropic":
        from app.llm.anthropic_provider import AnthropicProvider
        return AnthropicProvider()

    elif llm_type == "openai":
        from app.llm.openai_provider import OpenAIProvider
        return OpenAIProvider()

    elif llm_type == "gemini":
        from app.llm.gemini_provider import GeminiProvider
        return GeminiProvider()

    else:
        raise ValueError(
            f"지원하지 않는 LLM_TYPE: '{llm_type}'. "
            "사용 가능한 값: anthropic | openai | gemini"
        )
