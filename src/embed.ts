import { MessageEmbed, User } from "discord.js";

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
  reference?: User;
}

interface EmbedSettings {
  color?: string;
  descTransform?: (desc: string) => string;
  refTransform?: (user: User) => [string, string | undefined];
  author?: User;
}

export class Embed {
  color: string;
  descTransform: NonNullable<EmbedSettings["descTransform"]>;

  /**
   * @returns [name, avatarUrl or undefined]
   */
  refTransform: NonNullable<EmbedSettings["refTransform"]>;
  author: EmbedSettings["author"];
  constructor(options: EmbedSettings) {
    this.color = options.color ?? "#222222";
    this.descTransform = options.descTransform ?? ((x: string) => x);
    this.refTransform =
      options.refTransform ??
      ((x: User) => [x.username, x.avatarURL() ?? undefined]);
    this.author = options.author;
  }

  create(options: EmbedOptions) {
    let embed = new MessageEmbed()
      .setDescription(this.descTransform(options.desc ?? ""))
      .setColor(this.color);

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
      embed = embed.setImage(options.image);
    }

    if (options.sideImage) {
      embed = embed.setThumbnail(options.sideImage);
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
  }
}
