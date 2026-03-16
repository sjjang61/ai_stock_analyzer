import { TrendingUp } from "lucide-react";
import { authApi } from "@/api/auth";

export const LoginPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        {/* 로고 */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center mb-3">
            <TrendingUp size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Stock AI</h1>
          <p className="text-sm text-gray-400 mt-1">주식 AI 분석 플랫폼</p>
        </div>

        <h2 className="text-center text-base font-semibold text-gray-700 mb-6">
          소셜 로그인으로 시작하기
        </h2>

        <div className="space-y-3">
          {/* 카카오 로그인 */}
          <button
            onClick={authApi.loginKakao}
            className="w-full flex items-center justify-center gap-3 bg-[#FEE500] hover:bg-[#F5DC00] text-[#3C1E1E] font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            <KakaoIcon />
            카카오로 로그인
          </button>

          {/* 네이버 로그인 */}
          <button
            onClick={authApi.loginNaver}
            className="w-full flex items-center justify-center gap-3 bg-[#03C75A] hover:bg-[#02B050] text-white font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            <NaverIcon />
            네이버로 로그인
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
          로그인 시 서비스 이용약관 및<br />개인정보 처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
};

const KakaoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M9 0.5C4.306 0.5 0.5 3.468 0.5 7.125c0 2.363 1.572 4.44 3.953 5.607l-1.006 3.75a.25.25 0 0 0 .38.274L7.94 14.23c.347.04.7.062 1.06.062 4.694 0 8.5-2.968 8.5-6.625S13.694.5 9 .5Z"
      fill="#3C1E1E"
    />
  </svg>
);

const NaverIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path
      d="M10.266 9.229L7.477 0.5H0.5v17h7.234V8.771L10.523 17.5H17.5V0.5h-7.234z"
      fill="white"
    />
  </svg>
);
