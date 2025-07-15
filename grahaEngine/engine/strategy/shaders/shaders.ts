import { aVertexShader, aFragmentShader } from "./atmosphere.shaders";
import { pVertexShader, pFragmentShader } from "./planet.shaders";
import { sFragmentShader, sVertexShader } from "./selectionGlow.shaders";
import { skVertexShader, skFragmentShader } from "./sky.shaders";
import { sunFragmentShader, sunVertexShader } from "./sun.shaders";
import { tFragmentShader, tVertexShader } from "./tag.shaders";

export const Shaders = {
    planet: {
        vert: pVertexShader,
        frag: pFragmentShader
    },
    atmosphere: {
        vert: aVertexShader,
        frag: aFragmentShader,
    },
    sky: {
        vert: skVertexShader,
        frag: skFragmentShader,
    },
    selectionGlow: {
        vert: sVertexShader,
        frag: sFragmentShader,
    },
    tag: {
        vert: tVertexShader,
        frag: tFragmentShader,
    },
    sun: {
        vert: sunVertexShader,
        frag: sunFragmentShader,
    }
}