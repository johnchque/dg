import { buildSrc } from "@imagekit/javascript";

const urlEndpoint = import.meta.env.IMAGEKIT_URL_ENDPOINT;

export function ogImageUrl(path: string): string {
	return buildSrc({
		src: path,
		urlEndpoint,
		transformation: [{ width: 1200, height: 630, crop: "at_max" }],
	});
}
