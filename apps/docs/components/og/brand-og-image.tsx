import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const ogImageSize = { width: 1200, height: 630 };

type BrandOGImageProps = {
  title: string;
  description?: string;
  section: string;
};

let logoPromise: Promise<string> | undefined;

function getLogo() {
  logoPromise ??= readFile(join(process.cwd(), 'app/icon.jpg')).then(
    (logo) => `data:image/jpeg;base64,${logo.toString('base64')}`,
  );

  return logoPromise;
}

function WindowPreview() {
  const codeBars = [182, 126, 204, 148, 96];

  return (
    <div
      style={{
        position: 'absolute',
        top: 157,
        right: 68,
        display: 'flex',
        width: 410,
        height: 309,
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid rgba(255, 67, 97, 0.66)',
        borderRadius: 11,
        background: 'linear-gradient(145deg, #101011 0%, #080809 100%)',
        boxShadow: '0 0 34px rgba(255, 23, 68, 0.19)',
      }}
    >
      <div
        style={{
          display: 'flex',
          height: 43,
          alignItems: 'center',
          gap: 7,
          padding: '0 14px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(255, 255, 255, 0.025)',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 5, background: '#ff1744' }} />
        <span style={{ width: 8, height: 8, borderRadius: 5, background: '#f4c542' }} />
        <span style={{ width: 8, height: 8, borderRadius: 5, background: '#29c978' }} />
        <div
          style={{
            display: 'flex',
            height: 22,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 22,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 5,
            color: 'rgba(245, 245, 245, 0.55)',
            fontSize: 9,
            letterSpacing: 0.8,
            flex: 1,
          }}
        >
          WEBVIEW://MY-APP
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        <div
          style={{
            display: 'flex',
            width: 61,
            alignItems: 'center',
            flexDirection: 'column',
            gap: 14,
            paddingTop: 16,
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(255, 255, 255, 0.018)',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: 28,
              height: 28,
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255, 23, 68, 0.46)',
              borderRadius: 7,
              background: 'rgba(255, 23, 68, 0.12)',
              color: '#ff536d',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            W
          </div>
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              style={{
                display: 'flex',
                width: 27,
                height: 7,
                borderRadius: 4,
                background: item === 0 ? 'rgba(255, 23, 68, 0.66)' : 'rgba(245, 245, 245, 0.14)',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', padding: 17 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'rgba(245, 245, 245, 0.9)', fontSize: 13, fontWeight: 600 }}>Application</span>
            <span
              style={{
                padding: '4px 7px',
                border: '1px solid rgba(65, 205, 143, 0.22)',
                borderRadius: 4,
                color: '#6ad9a0',
                fontSize: 8,
                letterSpacing: 0.8,
              }}
            >
              RUNNING
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              height: 114,
              flexDirection: 'column',
              gap: 10,
              padding: 14,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 7,
              background: 'linear-gradient(120deg, rgba(255, 23, 68, 0.1), rgba(255, 255, 255, 0.025))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
              <span style={{ width: 6, height: 6, borderRadius: 4, background: '#ff1744' }} />
              <span style={{ width: 72, height: 5, borderRadius: 3, background: 'rgba(255, 255, 255, 0.34)' }} />
            </div>
            {codeBars.slice(0, 3).map((width, index) => (
              <div
                key={width}
                style={{
                  width,
                  height: 5,
                  marginLeft: index === 0 ? 9 : 17,
                  borderRadius: 3,
                  background: index === 1 ? 'rgba(255, 23, 68, 0.76)' : 'rgba(245, 245, 245, 0.21)',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', flex: 1, gap: 9, marginTop: 10 }}>
            {[codeBars[3], codeBars[4]].map((width, index) => (
              <div
                key={width}
                style={{
                  display: 'flex',
                  flex: 1,
                  flexDirection: 'column',
                  gap: 8,
                  padding: 10,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 6,
                  background: 'rgba(255, 255, 255, 0.025)',
                }}
              >
                <span style={{ width: 47, height: 4, borderRadius: 3, background: 'rgba(255, 255, 255, 0.19)' }} />
                <span
                  style={{
                    width: Math.min(width, 72),
                    height: 5,
                    borderRadius: 3,
                    background: index === 0 ? 'rgba(255, 255, 255, 0.16)' : '#ff3858',
                  }}
                />
                <span style={{ width: 62, height: 4, borderRadius: 3, background: 'rgba(255, 255, 255, 0.12)' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandOGImage({ title, description, section, logo }: BrandOGImageProps & { logo: string }) {
  const titleSize = title.length > 28 ? 62 : title.length > 21 ? 68 : 76;

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        color: '#f5f5f5',
        background: 'linear-gradient(130deg, #030303 0%, #080708 67%, #12040a 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          background: 'radial-gradient(ellipse at 82% 43%, rgba(255, 23, 68, 0.15) 0%, rgba(255, 23, 68, 0) 53%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 18,
          right: 18,
          bottom: 18,
          left: 18,
          border: '1px solid rgba(255, 255, 255, 0.13)',
          borderRadius: 14,
        }}
      />
      <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: 630, background: '#ff1744' }} />

      <div
        style={{
          position: 'absolute',
          top: 43,
          right: 58,
          left: 58,
          display: 'flex',
          height: 48,
          alignItems: 'center',
        }}
      >
        <img
          src={logo}
          style={{
            width: 44,
            height: 44,
            border: '1px solid rgba(255, 255, 255, 0.22)',
            borderRadius: 8,
            objectFit: 'cover',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginLeft: 13 }}>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.6 }}>WebviewJS</span>
          <span style={{ color: 'rgba(245, 245, 245, 0.58)', fontSize: 9, fontWeight: 600, letterSpacing: 2.2 }}>
            NATIVE DESKTOP RUNTIME
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            height: 34,
            alignItems: 'center',
            gap: 9,
            marginLeft: 'auto',
            padding: '0 12px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 6,
            background: 'rgba(8, 8, 9, 0.72)',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: 4, background: '#ff1744' }} />
          <span style={{ color: 'rgba(245, 245, 245, 0.84)', fontSize: 12, fontWeight: 600, letterSpacing: 1.2 }}>
            {section.toUpperCase()}
          </span>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 165,
          left: 65,
          display: 'flex',
          width: 665,
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ width: 7, height: 7, borderRadius: 4, background: '#ff1744' }} />
          <span style={{ color: '#ff536d', fontSize: 12, fontWeight: 700, letterSpacing: 2.4 }}>
            WEBVIEWJS DOCUMENTATION
          </span>
        </div>
        <div
          style={{
            maxWidth: 665,
            color: '#f5f5f5',
            fontSize: titleSize,
            fontWeight: 700,
            letterSpacing: -2.7,
            lineHeight: 0.98,
          }}
        >
          {title}
        </div>
        {description ? (
          <div
            style={{
              maxWidth: 625,
              marginTop: 22,
              color: 'rgba(245, 245, 245, 0.76)',
              fontSize: 24,
              fontWeight: 400,
              lineHeight: 1.4,
            }}
          >
            {description}
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: 'absolute',
          right: 59,
          bottom: 40,
          left: 65,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 15,
          borderTop: '1px solid rgba(255, 255, 255, 0.17)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 28, height: 2, background: '#ff1744' }} />
          <span style={{ color: 'rgba(245, 245, 245, 0.72)', fontSize: 11, fontWeight: 600, letterSpacing: 1.2 }}>
            SYSTEM WEBVIEW
          </span>
        </div>
        <span style={{ color: 'rgba(245, 245, 245, 0.58)', fontSize: 11, fontWeight: 600, letterSpacing: 1.2 }}>
          NODE.JS · BUN · DENO
        </span>
      </div>

      <WindowPreview />
    </div>
  );
}

export async function createBrandOGImageResponse(props: BrandOGImageProps) {
  const logo = await getLogo();

  return new ImageResponse(<BrandOGImage {...props} logo={logo} />, ogImageSize);
}
