import { aVertexShader, aFragmentShader } from "./atmosphere.shaders";
import { pVertexShader, pFragmentShader } from "./planet.shaders";
import { sFragmentShader, sVertexShader } from "./selectionGlow.shaders";
import { shadowFragmentShader, shadowVertexShader } from "./shadows.shaders";
import { skVertexShader, skFragmentShader } from "./sky.shaders";
import { sunFragmentShader, sunVertexShader } from "./sun.shaders";
import { tFragmentShader, tVertexShader } from "./tag.shaders";

export const Shaders: {[key:string] : {vert: string, frag: string}} = {
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
    },
    shadow: {
        vert: shadowVertexShader,
        frag: shadowFragmentShader,
    }
}