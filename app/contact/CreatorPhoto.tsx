"use client";

import Image from "next/image";
import { useState } from "react";

export default function CreatorPhoto() {
  const [unavailable, setUnavailable] = useState(false);

  return (
    <div className="creator-photo">
      {!unavailable ? (
        <Image
          src="/images/creator.jpg"
          alt="Sachin Singh, creator of my e-Wish"
          width={360}
          height={360}
          priority
          unoptimized
          onError={() => setUnavailable(true)}
        />
      ) : (
        <div className="creator-photo-placeholder" role="img" aria-label="Creator photo placeholder">
          <span>SS</span>
          <small>Add your portrait at public/images/creator.jpg</small>
        </div>
      )}
    </div>
  );
}
