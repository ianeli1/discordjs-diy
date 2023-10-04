import {
  ColorResolvable,
  AttachmentBuilder,
  EmbedBuilder,
  BaseMessageOptions,
  User,
} from "discord.js";

interface EmbedOptions {
  title?: string;
  desc?: string;
  color?: ColorResolvable;
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
  author?: Parameters<EmbedBuilder["setAuthor"]>;
  url?: string;
  footer?: Parameters<EmbedBuilder["setFooter"]>;
  reference?: User;
  components?: BaseMessageOptions["components"];
  files?: BaseMessageOptions["files"];
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
    this.createSingularEmbed = this.createSingularEmbed.bind(this);
  }

  private createSingularEmbed(options: EmbedOptions): BaseMessageOptions {
    let embed = new EmbedBuilder()
      .setDescription(this.descTransform(options.desc ?? ""))
      .setColor(options.color ?? this.color);

    const attachments = options.files ?? [];

    if (options.fields instanceof Array) {
      embed = embed.addFields(
        options.fields.map(({ title, desc, inline }) => ({
          name: title,
          value: desc,
          inline,
        }))
      );
    } else if (options.fields instanceof Object) {
      embed = embed.addFields([
        {
          name: options.fields.title,
          value: options.fields.desc,
          inline: options.fields.inline,
        },
      ]);
    }

    if (options.image) {
      embed = embed.setImage(this.images[options.image] ?? options.image);
    }

    if (options.sideImage) {
      embed = embed.setThumbnail(
        this.images[options.sideImage] ?? options.sideImage
      );
    }

    if (options.author) {
      embed = embed.setAuthor(...options.author);
    } else if (this.author) {
      embed = embed.setAuthor({
        name: this.author.username,
        iconURL: this.author.avatarURL() ?? undefined,
      });
    }

    if (options.url) {
      embed = embed.setURL(options.url);
    }

    if (options.footer) {
      embed = embed.setFooter(...options.footer);
    } else if (options.reference) {
      const [name, avatarUrl] = this.refTransform(options.reference);
      embed = embed.setFooter({
        text: name,
        iconURL: avatarUrl,
      });
    }

    if (options.title) {
      embed = embed.setTitle(options.title);
    }

    if (options.localImage) {
      attachments.push(new AttachmentBuilder(options.localImage));
      embed = embed.setImage(`attachment://${options.localImage}`);
    }
    return {
      embeds: [embed],
      files: attachments.length ? attachments : undefined,
      components: options.components,
    };
  }

  create(options: EmbedOptions | EmbedOptions[]): BaseMessageOptions {
    if (options instanceof Array) {
      const sendables = options
        .map((x) => this.createSingularEmbed(x))
        .reduce(
          (acc, { embeds = [], files = [], components = [] }) => ({
            embeds: [...(acc.embeds ?? []), ...embeds],
            files: [...(acc.files ?? []), ...files],
            components: [...(acc.components ?? []), ...components],
          }),
          { embeds: [], files: [] }
        );
      return sendables;
    }
    return this.createSingularEmbed(options);
  }

  registerImage(name: string, url: string) {
    this.images[name] = url;
    return name;
  }
}
