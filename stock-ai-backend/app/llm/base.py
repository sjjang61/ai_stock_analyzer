from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class LLMResponse:
    text: str
    model: str
    input_tokens: int
    output_tokens: int


class BaseLLMProvider(ABC):
    """모든 LLM 어댑터가 구현해야 할 인터페이스"""

    @abstractmethod
    async def complete(
        self,
        prompt: str,
        system: str = "",
        max_tokens: int = 2000,
        temperature: float = 0.2,
    ) -> LLMResponse:
        ...

    @property
    @abstractmethod
    def provider_name(self) -> str:
        ...
