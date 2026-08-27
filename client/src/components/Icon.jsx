const paths = {
  edit: 'M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3zM14 6l4 4',
  zoom: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm0-11v6m-3-3h6M21 21l-4.3-4.3',
  sync: 'M20 11a8 8 0 0 0-14-4L4 9m0-5v5h5M4 13a8 8 0 0 0 14 4l2-2m0 5v-5h-5',
  trash: 'M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13',
  link: 'M9 15 15 9M8 12l-2 2a3.5 3.5 0 0 0 5 5l2-2m2-2 2-2a3.5 3.5 0 0 0-5-5l-2 2',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  check: 'M5 13l4 4L19 7',
  external: 'M14 5h5v5M19 5l-8 8M12 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z',
  lock: 'M6 10V8a6 6 0 0 1 12 0v2M5 10h14v10H5z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c1.5-4 5-5 8-5s6.5 1 8 5',
  plus: 'M12 5v14M5 12h14',
  flip: 'M8 7H4v4M4 7l4.5 4.5M16 17h4v-4M20 17l-4.5-4.5M4 11a8 8 0 0 1 14-4M20 13a8 8 0 0 1-14 4',
  coffee: 'M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8zM17 9h2.5a2.5 2.5 0 0 1 0 5H17M7 3v2M11 3v2',
  heart: 'M12 20s-7-4.4-9.5-8.5C1 8 3 4.5 6.5 4.5c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3C21 4.5 23 8 21.5 11.5 19 15.6 12 20 12 20z',
};

export default function Icon({ name, size = 18, strokeWidth = 2.2, filled = false, style, ...rest }) {
  const d = paths[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={style}
      {...rest}
    >
      <path d={d} />
    </svg>
  );
}
