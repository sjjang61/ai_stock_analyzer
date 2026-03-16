export interface AuthUser {
  id: number;
  email: string | null;
  username: string;
  nickname: string | null;
  profile_image: string | null;
  provider: "kakao" | "naver" | null;
}
