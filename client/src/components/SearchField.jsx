import Icon from './Icon.jsx';

/** Own-drawn search box: magnifier, input, and a clear button when filled. */
export default function SearchField({ value, onChange, placeholder = 'Search', ...rest }) {
  return (
    <div className="searchfield">
      <Icon name="zoom" size={17} strokeWidth={2.4} className="searchfield__icon" />
      <input
        className="searchfield__input"
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
      {value ? (
        <button
          type="button"
          className="searchfield__clear"
          aria-label="Clear search"
          onClick={() => onChange('')}
        >
          <Icon name="plus" size={16} strokeWidth={2.8} style={{ transform: 'rotate(45deg)' }} />
        </button>
      ) : null}
    </div>
  );
}
