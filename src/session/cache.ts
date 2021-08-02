interface CacheProps {
  length: number;
  timeout: number;
}

//todo implement cache length verif

export class Cache<T> {
  length: number;
  timeout: number;
  private cache: {
    [name: string]: T;
  } = {};
  private timeoutCache: {
    [name: string]: NodeJS.Timeout;
  } = {};

  constructor({ length, timeout }: CacheProps) {
    this.length = length;
    this.timeout = timeout;
    this.set = this.set.bind(this);
    this.remove = this.remove.bind(this);
    this.get = this.get.bind(this);
    this.has = this.has.bind(this);
  }

  set(key: string, element: T) {
    key in this.timeoutCache && clearTimeout(this.timeoutCache[key]);
    this.timeoutCache[key] = setTimeout(
      () => void this.remove(key),
      this.timeout
    );
    return (this.cache[key] = element);
  }

  remove(key: string) {
    return delete this.cache[key];
  }

  get(key: string): T | undefined {
    return this.cache[key];
  }

  has(key: string) {
    return key in this.cache;
  }
}
