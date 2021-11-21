import {
  ColorResolvable,
  MessageAttachment,
  MessageEmbed,
  User,
} from "discord.js";
import { SendableMessage } from "./types";

interface EmbedOptions {
  title?: string;
  desc?: string;
  fields?:
    | {
        title: string;
        desc: string;
        inline?: boolean;
      }
    | {
        title: string;
        desc: string;
        inline?: boolean;
      }[];
  image?: string;
  sideImage?: string;
  localImage?: string;
  reference?: User;
}

interface EmbedSettings {
  color?: ColorResolvable;
  descTransform?: (desc: string) => string;
  refTransform?: (user: User) => [string, string | undefined];
  author?: User;
}

export class Embed {
  color: ColorResolvable;
  descTransform: NonNullable<EmbedSettings["descTransform"]>;

  /**
   * @returns [name, avatarUrl or undefined]
   */
  refTransform: NonNullable<EmbedSettings["refTransform"]>;
  author: EmbedSettings["author"];
  images: {
    [name: string]: string;
  } = {};

  constructor(options: EmbedSettings) {
    this.color = options.color ?? "#222222";
    this.descTransform = options.descTransform ?? ((x: string) => x);
    this.refTransform =
      options.refTransform ??
      ((x: User) => [x.username, x.avatarURL() ?? undefined]);
    this.author = options.author;
    this.create = this.create.bind(this);
  }

  create(options: EmbedOptions): SendableMessage {
    let embed = new MessageEmbed()
      .setDescription(this.descTransform(options.desc ?? ""))
      .setColor(this.color);

    const attachments = [];

    if (options.fields instanceof Array) {
      embed = embed.addFields(
        options.fields.map(({ title, desc, inline }) => ({
          name: title,
          value: desc,
          inline,
        }))
      );
    } else if (options.fields instanceof Object) {
      embed = embed.addField(
        options.fields.title,
        options.fields.desc,
        options.fields.inline
      );
    }

    if (options.image) {
      embed = embed.setImage(this.images[options.image] ?? options.image);
    }

    if (options.sideImage) {
      embed = embed.setThumbnail(
        this.images[options.sideImage] ?? options.sideImage
      );
    }

    if (this.author) {
      embed = embed.setAuthor(
        this.author.username,
        this.author.avatarURL() ?? undefined
      );
    }

    if (options.reference) {
      embed = embed.setFooter(...this.refTransform(options.reference));
    }

    if (options.title) {
      embed = embed.setTitle(options.title);
    }

    if (options.localImage) {
      attachments.push(new MessageAttachment(options.localImage));
      embed = embed.setImage(`attachment://${options.localImage}`);
    }
    return {
      embeds: [embed],
      files: attachments.length ? attachments : undefined,
    };
  }

  registerImage(name: string, url: string) {
    this.images[name] = url;
    return name;
  }
}
