// import { Entity } from "../Entity";

import { IComponent } from "../Component";
import { Entity } from "../Entity";


export class MoonComponent implements IComponent {
    parentEntity?: Entity
}
