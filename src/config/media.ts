/**
 * Site photography and video (files live in /public/photos and /public/video).
 * `position` is the CSS object-position focal point, used when a photo is
 * cropped (wide page-header backdrops, 4:5 cards).
 */
export interface SitePhoto {
  src: string;
  alt: string;
  position?: string;
}

export const PHOTOS = {
  // The red-couch music video shoot
  couchCrewColor: {
    src: "/photos/couch-crew-color.jpg",
    alt: "Lenko Psycho with the cast on the red couch during a DMY video shoot",
    position: "50% 40%",
  },
  couchCrewBw: {
    src: "/photos/couch-crew-bw.jpg",
    alt: "The DMY cast gathered on the couch, black and white",
    position: "50% 35%",
  },
  couchDuoColor: {
    src: "/photos/couch-duo-color.jpg",
    alt: "Lenko Psycho and a collaborator on set",
    position: "50% 35%",
  },
  couchDuoBw: {
    src: "/photos/couch-duo-bw.jpg",
    alt: "Lenko Psycho and a collaborator on the couch, black and white",
    position: "40% 35%",
  },
  couchVestBw: {
    src: "/photos/couch-vest-bw.jpg",
    alt: "Lenko Psycho in a leather vest on set",
    position: "40% 30%",
  },
  setMonitorBw: {
    src: "/photos/set-monitor-bw.jpg",
    alt: "Camera monitor framing a shot on a DMY set",
    position: "30% 70%",
  },
  setCameraCrew: {
    src: "/photos/set-camera-crew.jpg",
    alt: "Camera crew filming on a DMY set",
    position: "35% 40%", // landscape — keep the camera in narrow crops
  },
  setDmyTeeBw: {
    src: "/photos/set-dmy-tee-bw.jpg",
    alt: "Crew member in a darkmusicyard.com tee prepping Lenko Psycho on set",
    position: "35% 30%",
  },
  // Lenko solo — car park / Mercedes shoot
  carRedSeats: {
    src: "/photos/lenko-car-red-seats.jpg",
    alt: "Lenko Psycho smiling in a car with red leather seats",
    position: "50% 45%",
  },
  carSmileBw: {
    src: "/photos/lenko-car-smile-bw.jpg",
    alt: "Lenko Psycho smiling from the driver's seat, black and white",
    position: "35% 45%",
  },
  mercedesBw: {
    src: "/photos/lenko-mercedes-bw.jpg",
    alt: "Lenko Psycho beside a black Mercedes in a car park",
    position: "40% 40%",
  },
  carparkWalk: {
    src: "/photos/lenko-carpark-walk.jpg",
    alt: "Lenko Psycho walking past a black Mercedes",
    position: "40% 30%",
  },
  carparkPoseBw: {
    src: "/photos/lenko-carpark-pose-bw.jpg",
    alt: "Lenko Psycho posing in an underground car park, black and white",
    position: "30% 30%",
  },
  handsUpBw: {
    src: "/photos/lenko-hands-up-bw.jpg",
    alt: "Lenko Psycho with both hands raised, black and white",
    position: "50% 35%",
  },
  lounge: {
    src: "/photos/lenko-lounge.jpg",
    alt: "Lenko Psycho relaxing in a lounge",
    position: "45% 30%",
  },
} satisfies Record<string, SitePhoto>;

export const VIDEOS = {
  /** Muted, looping home-page background — a cut from a DMY music video. */
  hero: { src: "/video/hero.mp4", poster: "/video/hero-poster.jpg" },
  /** Vertical clip of Lenko on the car-park shoot (has sound). */
  lenkoOnSet: {
    src: "/video/lenko-on-set.mp4",
    poster: "/video/lenko-on-set.jpg",
    alt: "Lenko Psycho posing by a black Mercedes",
  },
};
