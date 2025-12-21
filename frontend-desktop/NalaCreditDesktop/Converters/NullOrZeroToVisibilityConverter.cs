using System;
using System.Globalization;
using System.Windows;
using System.Windows.Data;

namespace NalaCreditDesktop.Converters
{
    public class NullOrZeroToVisibilityConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            try
            {
                if (value == null) return Visibility.Collapsed;
                if (value is int i) return i > 0 ? Visibility.Visible : Visibility.Collapsed;
                if (value is long l) return l > 0 ? Visibility.Visible : Visibility.Collapsed;
                if (value is decimal d) return d > 0 ? Visibility.Visible : Visibility.Collapsed;
                if (value is double db) return db > 0 ? Visibility.Visible : Visibility.Collapsed;
                var s = value.ToString();
                if (int.TryParse(s, out var parsed)) return parsed > 0 ? Visibility.Visible : Visibility.Collapsed;
                return Visibility.Collapsed;
            }
            catch
            {
                return Visibility.Collapsed;
            }
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            return Binding.DoNothing;
        }
    }
}