"use client";

import { GoogleLogin } from "@react-oauth/google";
import { createClient } from "@/lib/supabase/client";

export function SignInWithGoogleButton() {
  return (
    <div className="w-full flex justify-center overflow-hidden rounded-2xl">
      <GoogleLogin
        onSuccess={async (credentialResponse) => {
          if (credentialResponse.credential) {
            const supabase = createClient();
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: credentialResponse.credential,
            });
            if (error) {
              window.location.assign(
                `/?error=oauth&message=${encodeURIComponent(error.message)}`,
              );
            } else if (data?.session) {
              window.location.assign("/lobby");
            } else {
              window.location.assign(
                "/?error=oauth&message=Session_non_cr%C3%A9%C3%A9e",
              );
            }
          }
        }}
        onError={() => {
          window.location.assign("/?error=oauth&message=Google_Login_Failed");
        }}
        useOneTap={process.env.NODE_ENV === "production"}
        shape="rectangular"
        size="large"
        theme="filled_black"
        text="continue_with"
        width="340"
      />
    </div>
  );
}
