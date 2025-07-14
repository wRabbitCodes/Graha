import { aVertexShader, aFragmentShader } from "./atmosphere.shaders";
import { pVertexShader, pFragmentShader } from "./planet.shaders";
import { vertexShader, fragmentShader } from "./sky.shaders";

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
        vert: vertexShader,
        frag: fragmentShader,
    }
}